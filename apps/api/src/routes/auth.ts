import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { safe } from '../utils/errors';
import { issueSession, authMiddleware, cookieName, hash } from '../utils/auth';
import { config } from '../config';

export const authRouter = Router();

const credentials = z.object({ 
  email: z.string().trim().toLowerCase().email(), 
  password: z.string().min(12).max(128) 
});

const publicUser = (u: any) => ({ id: u.id, email: u.email, role: u.role, profile: u.profile });

authRouter.post('/register', safe(async (req, res) => { 
  const input = credentials.extend({ name: z.string().trim().min(1).max(100) }).parse(req.body); 
  if (await prisma.user.findUnique({ where: { email: input.email } })) { 
    res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } }); 
    return;
  } 
  const passwordHash = await bcrypt.hash(input.password, 12); 
  const user = await prisma.user.create({ 
    data: { email: input.email, passwordHash, profile: { create: { name: input.name } } }, 
    include: { profile: true } 
  }); 
  await issueSession(user.id, res); 
  await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_REGISTERED' } }); 
  res.status(201).json({ data: publicUser(user) });
}));

authRouter.post('/login', safe(async (req, res) => { 
  const input = credentials.parse(req.body); 
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { profile: true } }); 
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) { 
    res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } }); 
    return;
  } 
  await issueSession(user.id, res); 
  await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_LOGGED_IN' } }); 
  res.json({ data: publicUser(user) });
}));

authRouter.post('/logout', safe(async (req, res) => { 
  const token = req.cookies[cookieName] as string | undefined; 
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hash(token) } }); 
  res.clearCookie(cookieName, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', path: '/' }); 
  res.status(204).send();
}));

authRouter.get('/me', authMiddleware, safe(async (req: any, res) => { 
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, include: { profile: true } }); 
  res.json({ data: publicUser(user) });
}));
