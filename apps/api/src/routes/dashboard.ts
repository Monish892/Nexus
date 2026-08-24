import { Router } from 'express';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

dashboardRouter.get('/summary', safe(async (req: any, res) => { 
  const [repositories, latestScore] = await Promise.all([
    prisma.repository.findMany({ where: { userId: req.user.id }, orderBy: { updatedAt: 'desc' }, take: 10 }), 
    prisma.developerScore.findFirst({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } })
  ]); 
  res.json({ data: { latestScore, repositories } });
}));
