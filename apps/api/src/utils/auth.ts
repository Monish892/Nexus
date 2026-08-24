import { type NextFunction, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db';
import { config } from '../config';
import { type Role } from '@prisma/client';

export const cookieName = 'nexus_session';

export const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export type AuthRequest = Request & { user?: { id: string; email: string; role: Role } };

export async function issueSession(userId: string, res: Response) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_DAYS * 86400000);
  await prisma.session.create({ data: { userId, tokenHash: hash(token), expiresAt } });
  res.cookie(cookieName, token, { 
    httpOnly: true, 
    secure: config.NODE_ENV === 'production', 
    sameSite: 'lax', 
    expires: expiresAt, 
    path: '/' 
  });
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies[cookieName] as string | undefined;
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
  
  const session = await prisma.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  
  if (!session || session.expiresAt <= new Date()) { 
    if (session) await prisma.session.delete({ where: { id: session.id } }); 
    return res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Session expired' } });
  }
  
  req.user = { id: session.user.id, email: session.user.email, role: session.user.role };
  return next();
}
