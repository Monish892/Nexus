import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';
import { config } from '../config';

export const roadmapRouter = Router();
roadmapRouter.use(authMiddleware);

roadmapRouter.get('/', safe(async (req: any, res) => {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: req.user.id },
    include: { items: { orderBy: { priority: 'asc' } }, progress: true },
    orderBy: { updatedAt: 'desc' }
  });
  res.json({ data: roadmaps });
}));

const generateInput = z.object({
  targetRole: z.string().trim().min(1)
});

roadmapRouter.post('/generate', safe(async (req: any, res) => {
  const input = generateInput.parse(req.body);

  // Fetch some context to generate roadmap
  const latestScore = await prisma.developerScore.findFirst({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });

  const jobMatches = await prisma.jobMatch.findMany({
    where: { userId: req.user.id },
    include: { skillGaps: true },
    orderBy: { createdAt: 'desc' },
    take: 3
  });

  const gaps = new Set<string>();
  for (const match of jobMatches) {
    for (const gap of match.skillGaps) {
      gaps.add(gap.skillName);
    }
  }

  let items = [
    { title: 'Learn Advanced Patterns', description: 'Deep dive into architecture.', priority: 1 },
    { title: 'Build a Portfolio Project', description: 'Create a full-stack app.', priority: 2 }
  ];

  if (gaps.size > 0) {
    items = Array.from(gaps).map((gap, i) => ({
      title: `Master ${gap}`,
      description: `Learn and build a project using ${gap} to fill your skill gap.`,
      priority: i + 1
    }));
  }

  if (config.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `You are an expert career coach. The user wants to become a ${input.targetRole}. Their identified skill gaps are: ${Array.from(gaps).join(', ')}. Generate a structured learning roadmap. Output JSON with: items (array of objects with title, description, and priority).` },
            { role: 'user', content: 'Generate roadmap' }
          ]
        })
      });
      if (response.ok) {
        const aiData = await response.json() as any;
        const result = JSON.parse(aiData.choices[0].message.content);
        if (result.items && result.items.length > 0) {
          items = result.items;
        }
      }
    } catch (e) {
      console.warn('AI Roadmap generation failed');
    }
  }

  const roadmap = await prisma.roadmap.create({
    data: {
      userId: req.user.id,
      targetRole: input.targetRole,
      items: {
        create: items
      }
    },
    include: { items: { orderBy: { priority: 'asc' } } }
  });

  res.status(201).json({ data: roadmap });
}));

const progressInput = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
});

roadmapRouter.patch('/:id/items/:itemId/progress', safe(async (req: any, res) => {
  const { id: roadmapId, itemId } = req.params;
  const input = progressInput.parse(req.body);

  const roadmap = await prisma.roadmap.findFirstOrThrow({
    where: { id: roadmapId, userId: req.user.id }
  });

  const progress = await prisma.roadmapProgress.findFirst({
    where: { roadmapId: roadmap.id, itemId: itemId }
  });

  let newProgress;
  if (progress) {
    newProgress = await prisma.roadmapProgress.update({
      where: { id: progress.id },
      data: { status: input.status }
    });
  } else {
    newProgress = await prisma.roadmapProgress.create({
      data: {
        roadmapId: roadmap.id,
        itemId: itemId,
        status: input.status
      }
    });
  }

  res.json({ data: newProgress });
}));
