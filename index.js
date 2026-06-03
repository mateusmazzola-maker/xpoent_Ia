import 'dotenv/config'
import express from 'express'
import { initDB } from './src/lib/db.js'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import logger from './src/lib/logger.js'
import { withTenant } from './src/middleware/tenant.js'
import { requireAuth } from './src/middleware/auth.js'
import { sseBroker } from './src/lib/sse.js'
import { startScheduler } from './src/lib/scheduler.js'

// Rotas Sprint 1–2
import authRouter      from './src/routes/auth.js'
import clientsRouter   from './src/routes/clients.js'
import projectsRouter  from './src/routes/projects.js'
import analyticsRouter from './src/routes/analytics.js'
import scheduleRouter  from './src/routes/schedule.js'
import approvalsRouter from './src/routes/approvals.js'
import crmRouter       from './src/routes/crm.js'
import emailRouter     from './src/routes/email.js'
import designsRouter   from './src/routes/designs.js'
import aiRouter        from './src/routes/ai.js'
import miscRouter      from './src/routes/misc.js'

// Rotas Sprint 3 (novas)
import dashboardRouter  from './src/routes/dashboard.js'
import onboardingRouter from './src/routes/onboarding.js'

// Sprint 4: ai.js expandido — pauta, brand-voice, engagement-score, reels-script, ab-variations

// Rotas Sprint 5 (novas)
import imagesRouter from './src/routes/images.js'

// Rotas Sprint 6 (novas)
// Sprints 7-20: módulos finais
import studioRouter      from './src/routes/studio.js'
import landingsRouter    from './src/routes/landings.js'
import waAbtestsRouter   from './src/routes/whatsapp_abtests.js'
import { analyticsRouter as analyticsV2Router, reportsRouter }
                         from './src/routes/analytics_reports.js'
import { marketplaceRouter, agencyRouter, webhooksRouter, docsRouter }
                         from './src/routes/agency_marketplace.js'

import trendsRouter      from './src/routes/trends.js'
import automationsRouter from './src/routes/automations.js'
import brandKitRouter    from './src/routes/brandkit.js'
import socialRouter      from './src/routes/social.js'
import billingRouter     from './src/routes/billing.js'
import proposalsRouter   from './src/routes/proposals.js'
import linkedinRouter    from './src/routes/linkedin.js'
import videoRouter       from './src/routes/video.js'
import seoRouter         from './src/routes/seo.js'
import chatbotRouter     from './src/routes/chatbot.js'
import adsRouter         from './src/routes/ads.js'
import tiktokRouter      from './src/routes/tiktok.js'
import youtubeRouter     from './src/routes/youtube.js'
import socialExtraRouter from './src/routes/social_extra.js'
import aiMediaRouter     from './src/routes/ai_media.js'
import googleAnalyticsRouter from './src/routes/google_analytics.js'
import growthRouter      from './src/routes/growth.js'
import infraRouter       from './src/routes/infra.js'
import setupRouter       from './src/routes/setup.js'
import tasksRouter       from './src/routes/tasks.js'
import financeRouter     from './src/routes/finance.js'
import prospectingRouter from './src/routes/prospecting.js'
import performanceRouter from './src/routes/performance.js'
import annotationsRouter from './src/routes/annotations.js'
import bulkRouter        from './src/routes/bulk.js'
import designRouter      from './src/routes/design.js'
import designerRouter    from './src/routes/designer.js'

const app  = express()
const PORT = process.env.PORT || 3000

// Hostinger usa proxy reverso — necessário para cookies e HTTPS
app.set('trust proxy', 1)

// ── Middlewares globais ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],  // SSE usa mesma origem
    },
  },
}))

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf } // necessário para validar assinatura do webhook Meta
}))
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

// Serve uploads locais
app.use('/uploads', express.static('uploads'))

// Rate limiting
// Rate limiting por IP — req.user não está disponível aqui (roda antes de requireAuth).
// Para limites por usuário autenticado, aplique um segundo limiter dentro das rotas específicas.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
})

// Limiter mais restrito para rotas de autenticação (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde 15 minutos.' },
  keyGenerator: (req) => req.ip,
})
app.use('/api/', limiter)

// ── Rotas de autenticação (sem tenant) ──────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter)

// ── Middleware de tenant para todas as rotas autenticadas ────────────────────
app.use('/api', withTenant)

// ── Rotas da API ─────────────────────────────────────────────────────────────
app.use('/api/dashboard',   dashboardRouter)
app.use('/api/onboarding',  onboardingRouter)
app.use('/api/clients',     clientsRouter)
app.use('/api/projects',    projectsRouter)
app.use('/api/analytics',   analyticsRouter)
app.use('/api/schedule',    scheduleRouter)
app.use('/api/approvals',   approvalsRouter)
app.use('/api/crm',         crmRouter)
app.use('/api/email',       emailRouter)
app.use('/api/designs',     designsRouter)
app.use('/api/generate',    aiRouter)
app.use('/api/images',      imagesRouter)
app.use('/api/trends',       trendsRouter)
app.use('/api/automations',  automationsRouter)
app.use('/api/brand-kit',    brandKitRouter)
app.use('/api/social',       socialRouter)
app.use('/api/billing',      billingRouter)
app.use('/api/proposals',    proposalsRouter)
app.use('/api/linkedin',     linkedinRouter)
app.use('/api/video',        videoRouter)
app.use('/api/seo',          seoRouter)
app.use('/api/chatbot',      chatbotRouter)
app.use('/api/ads',          adsRouter)
app.use('/api/tiktok',       tiktokRouter)
app.use('/api/youtube',      youtubeRouter)
app.use('/api/social-extra', socialExtraRouter)
app.use('/api/ai-media',     aiMediaRouter)
app.use('/api/google',       googleAnalyticsRouter)
app.use('/api/growth',       growthRouter)
app.use('/api',              infraRouter)
app.use('/api/setup',        setupRouter)
app.use('/api/tasks',        tasksRouter)
app.use('/api/finance',      financeRouter)
app.use('/api/prospecting',  prospectingRouter)
app.use('/api/performance',  performanceRouter)
app.use('/api/annotations',  annotationsRouter)
app.use('/api/bulk',         bulkRouter)
app.use('/api/design',       designRouter)
app.use('/api/designer',     designerRouter)

app.use('/api/studio',       studioRouter)
app.use('/api/landings',     landingsRouter)
app.use('/api',              waAbtestsRouter)    // /api/whatsapp/* e /api/abtests/*
app.use('/api/analytics',    analyticsV2Router)  // sobrescreve rotas novas do analytics
app.use('/api/reports',      reportsRouter)
app.use('/api/marketplace',  marketplaceRouter)
app.use('/api/agency',       agencyRouter)
app.use('/api/webhooks',     webhooksRouter)
app.use('/',                 docsRouter)         // GET /api/docs

app.use('/api',             miscRouter)

// ── SSE — Notificações em tempo real ─────────────────────────────────────────
// GET /api/events
// Mantém uma conexão SSE aberta por usuário autenticado.
// Eventos emitidos: notification, schedule_published, system
app.get('/api/events', requireAuth, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Nginx: desativa buffer

  // Envia evento de conexão confirmada
  res.write(`event: connected\ndata: ${JSON.stringify({ user_id: req.user.sub, ts: new Date().toISOString() })}\n\n`)

  sseBroker.subscribe(req.user.sub, res)
  logger.debug({ user_id: req.user.sub, total: sseBroker.connectionCount }, 'SSE conectado')
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  ok: true,
  version: '7.0.3',
  ts: new Date().toISOString(),
  sse_connections: sseBroker.connectionCount,
}))

// ── Boot: inicializa banco, scheduler e servidor ──────────────────────────────
let server
;(async () => {
  try {
    await initDB()
    logger.info('✓ Banco de dados inicializado')
  } catch (err) {
    logger.error({ err }, '✗ Falha ao inicializar banco — verifique as variaveis DB_*')
    process.exit(1)
  }

  startScheduler()

  server = app.listen(PORT, () => {
    logger.info({ port: PORT }, `Xpoent v7.0.0 — Plataforma completa rodando`)
  })
})()

let shuttingDown = false
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'Encerrando servidor...')
  server.close(() => {
    logger.info('Servidor encerrado.')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))

export default app
