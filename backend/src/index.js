import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import chatRoutes from './routes/chat.js'
import knowledgeRoutes from './routes/knowledge.js'
import adminRoutes from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3001

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================
app.use(helmet())
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    /\.vercel\.app$/,
    /\.netlify\.app$/
  ],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
const chatLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 30 })
app.use(limiter)

// ============================================================
// ROTAS
// ============================================================
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'EAS Expert Agent',
  version: '1.0.0',
  timestamp: new Date().toISOString()
}))

app.use('/chat', chatLimiter, chatRoutes)
app.use('/knowledge', knowledgeRoutes)
app.use('/admin', adminRoutes)

// 404
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }))

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║     EAS EXPERT AGENT - Backend        ║
║     Rodando na porta ${PORT}             ║
║     Supabase: wqecrvjulzfgwhgiehmg    ║
╚═══════════════════════════════════════╝
  `)
})