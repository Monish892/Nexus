import { Router } from 'express';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';

export const intelligenceRouter = Router();
intelligenceRouter.use(authMiddleware);

intelligenceRouter.get('/skill-graph', safe(async (req: any, res) => {
  // Aggregate data for the skill graph
  const skills = await prisma.skill.findMany({
    where: { userId: req.user.id },
    include: { evidence: true }
  });

  const latestScore = await prisma.developerScore.findFirst({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });

  const repositories = await prisma.repository.findMany({
    where: { userId: req.user.id },
    select: { name: true, primaryLanguage: true, stars: true }
  });

  // Construct graph
  const graph = {
    nodes: [] as any[],
    links: [] as any[]
  };

  // Roles -> Domains -> Skills -> Evidence
  graph.nodes.push({ id: 'Full-Stack Developer', group: 'role' });

  // Add Domains
  const domains = ['Frontend', 'Backend', 'DevOps', 'AI'];
  for (const d of domains) {
    graph.nodes.push({ id: d, group: 'domain' });
    graph.links.push({ source: 'Full-Stack Developer', target: d });
  }

  // Add Skills
  for (const skill of skills) {
    graph.nodes.push({ id: skill.name, group: 'skill', score: skill.score });
    graph.links.push({ source: skill.domain || 'Frontend', target: skill.name });

    // Add Evidence
    for (const ev of skill.evidence) {
      const evId = `ev-${ev.id}`;
      graph.nodes.push({ id: evId, group: 'evidence', label: ev.description });
      graph.links.push({ source: skill.name, target: evId });
    }
  }

  // If no skills explicitly added, derive from repo languages
  if (skills.length === 0) {
    const langSet = new Set<string>();
    for (const r of repositories) {
      if (r.primaryLanguage) langSet.add(r.primaryLanguage);
    }
    for (const lang of langSet) {
      graph.nodes.push({ id: lang, group: 'skill', score: 50 });
      graph.links.push({ source: 'Backend', target: lang }); // default to backend for demo
    }
  }

  res.json({ data: { graph, latestScore, repositories } });
}));
