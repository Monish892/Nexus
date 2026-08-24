import 'dotenv/config'
import express from 'express'
import { z } from 'zod'

const config = z.object({ PORT: z.coerce.number().default(4000), NODE_ENV: z.string().default('development') }).parse(process.env)
const app = express()
app.use(express.json({ limit: '1mb' }))
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() }))
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }))
app.listen(config.PORT, () => console.log(JSON.stringify({ level: 'info', message: 'NEXUS API listening', port: config.PORT, environment: config.NODE_ENV })))
