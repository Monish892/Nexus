import 'dotenv/config'
import crypto from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { PrismaClient, type Role } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const config = z.object({ PORT: z.coerce.number().default(4000), NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), WEB_ORIGIN: z.string().default('http://localhost:3000'), SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7) }).parse(process.env)
const app = express()
const cookieName = 'nexus_session'
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex')
const credentials = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(12).max(128) })
const profileInput = z.object({ name: z.string().trim().min(1).max(100).nullable().optional(), headline: z.string().trim().max(160).nullable().optional(), bio: z.string().trim().max(2000).nullable().optional(), location: z.string().trim().max(120).nullable().optional(), yearsExperience: z.number().int().min(0).max(70).nullable().optional(), targetRole: z.string().trim().max(120).nullable().optional() })
const githubRepositoryInput = z.object({ owner: z.string().regex(/^[A-Za-z0-9_.-]+$/), name: z.string().regex(/^[A-Za-z0-9_.-]+$/) })
type AuthRequest = Request & { user?: { id: string; email: string; role: Role } }
const safe = (fn: (req: AuthRequest, res: Response) => Promise<void>) => (req: AuthRequest, res: Response, next: NextFunction) => fn(req, res).catch(next)
const publicUser = (u: { id: string; email: string; role: Role; profile: unknown }) => ({ id: u.id, email: u.email, role: u.role, profile: u.profile })

app.use(helmet())
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use('/auth', rateLimit({ windowMs: 900000, limit: 30, standardHeaders: true, legacyHeaders: false }))

async function issueSession(userId: string, res: Response) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 86400000)
  await prisma.session.create({ data: { userId, tokenHash: hash(token), expiresAt } })
  res.cookie(cookieName, token, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', expires: expiresAt, path: '/' })
}

async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies[cookieName] as string | undefined
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } })
  const session = await prisma.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } })
  if (!session || session.expiresAt <= new Date()) { if (session) await prisma.session.delete({ where: { id: session.id } }); return res.status(401).json({ error: { code: 'SESSION_EXPIRED', message: 'Session expired' } }) }
  req.user = { id: session.user.id, email: session.user.email, role: session.user.role }
  return next()
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() }))
app.post('/auth/register', safe(async (req, res) => { const input = credentials.extend({ name: z.string().trim().min(1).max(100) }).parse(req.body); if (await prisma.user.findUnique({ where: { email: input.email } })) { res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } }); return } const passwordHash = await bcrypt.hash(input.password, 12); const user = await prisma.user.create({ data: { email: input.email, passwordHash, profile: { create: { name: input.name } } }, include: { profile: true } }); await issueSession(user.id, res); await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_REGISTERED' } }); res.status(201).json({ data: publicUser(user) }) }))
app.post('/auth/login', safe(async (req, res) => { const input = credentials.parse(req.body); const user = await prisma.user.findUnique({ where: { email: input.email }, include: { profile: true } }); if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) { res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } }); return } await issueSession(user.id, res); await prisma.auditLog.create({ data: { userId: user.id, action: 'AUTH_LOGGED_IN' } }); res.json({ data: publicUser(user) }) }))
app.post('/auth/logout', safe(async (req, res) => { const token = req.cookies[cookieName] as string | undefined; if (token) await prisma.session.deleteMany({ where: { tokenHash: hash(token) } }); res.clearCookie(cookieName, { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax', path: '/' }); res.status(204).send() }))
app.get('/auth/me', auth, safe(async (req, res) => { const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, include: { profile: true } }); res.json({ data: publicUser(user) }) }))
app.get('/profile', auth, safe(async (req, res) => { res.json({ data: await prisma.profile.findUnique({ where: { userId: req.user!.id } }) }) }))
app.patch('/profile', auth, safe(async (req, res) => { const input = profileInput.parse(req.body); const profile = await prisma.profile.upsert({ where: { userId: req.user!.id }, create: { userId: req.user!.id, ...input }, update: input }); await prisma.auditLog.create({ data: { userId: req.user!.id, action: 'PROFILE_UPDATED' } }); res.json({ data: profile }) }))
app.get('/repositories', auth, safe(async (req, res) => { const repositories = await prisma.repository.findMany({ where: { userId: req.user!.id }, include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' } }); res.json({ data: repositories }) }))
app.post('/github/import', auth, safe(async (req, res) => { const input = githubRepositoryInput.parse(req.body); const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'nexus-platform' } }); if (!response.ok) { res.status(response.status === 404 ? 404 : 502).json({ error: { code: 'GITHUB_UNAVAILABLE', message: 'GitHub repository could not be retrieved' } }); return } const remote = await response.json() as { id: number; full_name: string; html_url: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number; private: boolean }; const languagesResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}/languages`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'nexus-platform' } }); const languages = languagesResponse.ok ? await languagesResponse.json() as Record<string, number> : {}; const readmeResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}/readme`, { headers: { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'nexus-platform' } }); const readme = readmeResponse.ok ? await readmeResponse.text() : ''; const scores = { codeQuality: Math.min(100, 45 + (readme.length > 300 ? 15 : 0) + (Object.keys(languages).length > 1 ? 15 : 0)), documentation: readme.length > 300 ? 80 : 25, testing: 0, architecture: Object.keys(languages).length > 1 ? 70 : 45 }; const overall = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.values(scores).length); const signals = { hasReadme: readme.length > 0, readmeLength: readme.length, languageCount: Object.keys(languages).length, stars: remote.stargazers_count, forks: remote.forks_count }; const repository = await prisma.repository.upsert({ where: { userId_githubId: { userId: req.user!.id, githubId: remote.id } }, create: { userId: req.user!.id, githubId: remote.id, owner: input.owner, name: input.name, fullName: remote.full_name, url: remote.html_url, description: remote.description, primaryLanguage: remote.language, stars: remote.stargazers_count, forks: remote.forks_count, isPrivate: remote.private, languages, analyzedAt: new Date(), analyses: { create: { summary: `Deterministic repository analysis for ${remote.full_name}`, signals, scores } } }, update: { description: remote.description, primaryLanguage: remote.language, stars: remote.stargazers_count, forks: remote.forks_count, languages, analyzedAt: new Date(), analyses: { create: { summary: `Deterministic repository analysis for ${remote.full_name}`, signals, scores } } }, include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } } }); await prisma.developerScore.create({ data: { userId: req.user!.id, overall, breakdown: scores, evidence: { repository: remote.full_name, signals } } }); res.status(201).json({ data: repository }) }))
app.get('/dashboard/summary', auth, safe(async (req, res) => { const [repositories, latestScore] = await Promise.all([prisma.repository.findMany({ where: { userId: req.user!.id }, orderBy: { updatedAt: 'desc' }, take: 10 }), prisma.developerScore.findFirst({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } })]); res.json({ data: { latestScore, repositories } }) }))
app.get('/admin/audit-logs', auth, safe(async (req, res) => { if (req.user!.role !== 'ADMIN') { res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }); return } res.json({ data: await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }) }) }))
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }))
app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => { void next; if (error instanceof z.ZodError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.flatten().fieldErrors } }); console.error(error); return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }) })
app.listen(config.PORT, () => console.log(JSON.stringify({ level: 'info', message: 'NEXUS API listening', port: config.PORT, environment: config.NODE_ENV })))
