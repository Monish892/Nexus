import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { errorHandler } from './utils/errors';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { dashboardRouter } from './routes/dashboard';
import { githubRouter } from './routes/github';
import { adminRouter } from './routes/admin';
import { resumeRouter } from './routes/resume';
import { jobRouter } from './routes/job';
import { interviewRouter } from './routes/interview';
import { codingRouter } from './routes/coding';
import { roadmapRouter } from './routes/roadmap';
import { notificationRouter } from './routes/notification';
import { intelligenceRouter } from './routes/intelligence';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/auth', rateLimit({ windowMs: 900000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() }));

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/dashboard', dashboardRouter);
app.use('/github', githubRouter);
app.use('/admin', adminRouter);
app.use('/resume', resumeRouter);
app.use('/jobs', jobRouter);
app.use('/interviews', interviewRouter);
app.use('/coding', codingRouter);
app.use('/roadmaps', roadmapRouter);
app.use('/notifications', notificationRouter);
app.use('/intelligence', intelligenceRouter);
app.use('/repositories', githubRouter); // For backwards compatibility

app.use((_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }) });
app.use(errorHandler);
