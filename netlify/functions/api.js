import serverless from 'serverless-http'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import chatRoutes from '../../backend/src/routes/chat.js'
import knowledgeRoutes from '../../backend/src/routes/knowledge.js'
import adminRoutes from '../../backend/src/routes/admin.js'
import documentRoutes from '../../backend/src/routes/documents.js'

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })
const chatLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 30 })

app.use(limiter)

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'EAS Expert Agent',
  version: '1.0.0'
}))

app.use('/api/chat', chatLimiter, chatRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/documents', documentRoutes)

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

export const handler = serverless(app)
