import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';
import { config } from '../config';

export const jobRouter = Router();
jobRouter.use(authMiddleware);

const jobInput = z.object({
  title: z.string().trim().min(1),
  company: z.string().trim().optional(),
  content: z.string().trim().min(10)
});

jobRouter.get('/', safe(async (req: any, res) => {
  const jobs = await prisma.jobDescription.findMany({
    where: { userId: req.user.id },
    include: { matches: { orderBy: { overallScore: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ data: jobs });
}));

jobRouter.post('/parse', safe(async (req: any, res) => {
  const input = jobInput.parse(req.body);
  
  let parsedData: any = { requiredSkills: [], preferredSkills: [], seniority: 'Mid' };
  
  // Basic heuristic parsing
  const keywords = ['javascript', 'typescript', 'react', 'node.js', 'sql', 'api', 'docker', 'git', 'aws', 'python', 'java', 'c++', 'c#', 'go', 'rust'];
  const foundSkills = keywords.filter(k => input.content.toLowerCase().includes(k));
  parsedData.requiredSkills = foundSkills;
  
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
            { role: 'system', content: 'You are an expert recruiter. Extract structured data from this job description. Output JSON with: requiredSkills (string array), preferredSkills (string array), seniority (string), technologies (string array).' },
            { role: 'user', content: input.content }
          ]
        })
      });
      if (response.ok) {
        const aiData = await response.json() as any;
        parsedData = JSON.parse(aiData.choices[0].message.content);
      }
    } catch (e) {
      console.warn('AI Parsing failed, falling back to heuristics');
    }
  }

  const job = await prisma.jobDescription.create({
    data: {
      userId: req.user.id,
      title: input.title,
      company: input.company,
      content: input.content,
      parsedData
    }
  });

  res.status(201).json({ data: job });
}));

jobRouter.post('/:id/match', safe(async (req: any, res) => {
  const jobId = req.params.id;
  const job = await prisma.jobDescription.findFirstOrThrow({
    where: { id: jobId, userId: req.user.id }
  });

  // Calculate match based on DeveloperScore and Resumes
  const latestScore = await prisma.developerScore.findFirst({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });

  const parsedData = job.parsedData as any || { requiredSkills: [] };
  const required = parsedData.requiredSkills || [];
  
  // Simplified logic
  let score = 0;
  const gaps: any[] = [];
  
  const userEvidence = latestScore ? JSON.stringify(latestScore.evidence).toLowerCase() : '';
  
  for (const skill of required) {
    if (userEvidence.includes(skill.toLowerCase())) {
      score += 10;
    } else {
      gaps.push({ skillName: skill, importance: 'HIGH' });
    }
  }

  const overallScore = required.length > 0 ? Math.min(100, Math.round((score / (required.length * 10)) * 100)) : 0;

  const match = await prisma.jobMatch.create({
    data: {
      jobDescriptionId: job.id,
      userId: req.user.id,
      overallScore,
      skillGaps: {
        create: gaps
      }
    },
    include: { skillGaps: true }
  });

  res.status(201).json({ data: match });
}));
