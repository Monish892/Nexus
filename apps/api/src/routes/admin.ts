import { Router } from 'express';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';

export const adminRouter = Router();
adminRouter.use(authMiddleware);

adminRouter.get('/audit-logs', safe(async (req: any, res) => { 
  if (req.user.role !== 'ADMIN') { 
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }); 
    return;
  } 
  res.json({ data: await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }) });
}));
