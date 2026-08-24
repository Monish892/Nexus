import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';

export const profileRouter = Router();
profileRouter.use(authMiddleware);

const profileInput = z.object({ 
  name: z.string().trim().min(1).max(100).nullable().optional(), 
  headline: z.string().trim().max(160).nullable().optional(), 
  bio: z.string().trim().max(2000).nullable().optional(), 
  location: z.string().trim().max(120).nullable().optional(), 
  yearsExperience: z.number().int().min(0).max(70).nullable().optional(), 
  targetRole: z.string().trim().max(120).nullable().optional() 
});

profileRouter.get('/', safe(async (req: any, res) => { 
  res.json({ data: await prisma.profile.findUnique({ where: { userId: req.user.id } }) });
}));

profileRouter.patch('/', safe(async (req: any, res) => { 
  const input = profileInput.parse(req.body); 
  const profile = await prisma.profile.upsert({ 
    where: { userId: req.user.id }, 
    create: { userId: req.user.id, ...input }, 
    update: input 
  }); 
  await prisma.auditLog.create({ data: { userId: req.user.id, action: 'PROFILE_UPDATED' } }); 
  res.json({ data: profile });
}));
