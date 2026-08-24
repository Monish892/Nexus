import { Router } from 'express';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { authMiddleware } from '../utils/auth';

export const notificationRouter = Router();
notificationRouter.use(authMiddleware);

notificationRouter.get('/', safe(async (req: any, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({ data: notifications });
}));

notificationRouter.patch('/:id/read', safe(async (req: any, res) => {
  const { id } = req.params;
  const notification = await prisma.notification.update({
    where: { id: id, userId: req.user.id },
    data: { read: true }
  });
  res.json({ data: notification });
}));
