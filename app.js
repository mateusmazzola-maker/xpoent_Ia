import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import logger from './src/lib/logger.js'
import { withTenant } from './src/middleware/tenant.js'
import { requireAuth } from './src/middleware/auth.js'
import { sseBroker } from './src/lib/sse.js'

// Routes
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
import dashboardRouter  from './src/routes/dashboard.js'
import onboardingRouter from './src/routes/onboarding.js'
import imagesRouter from './src/routes/images.js'
import studioRouter      from './src/routes/studio.js'
import landingsRouter    from './src/routes/landings.js'
import waAbtestsRouter   from './src/routes/whatsapp_abtests.js'
import { analyticsRouter as analyticsV2Router, reportsRouter } from './src/routes/analytics_reports.js'
import { marketplaceRouter, agencyRouter, webhooksRouter, docsRouter } from './src/routes/agency_marketplace.js'
import trendsRouter      from './src/routes/trends.js'
import automationsRouter from './src/routes/automations.js'
import brandKitRouter    from './src/routes/brandkit.js'

export const app = express()

app.set('trust proxy', 1)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}))

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use('/uploads', express.static('uploads'))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde 15 minutos.' },
  keyGenerator: (req) => req.ip,
})

app.use('/api/', limiter)
app.use('/api/auth', authLimiter, authRouter)
app.get('/api/health', (req, res) => res.json({
  ok: true,
  version: '7.0.3',
  ts: new Date().toISOString(),
  sse_connections: sseBroker.connectionCount,
}))

app.use('/api', withTenant)

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
app.use('/api/studio',       studioRouter)
app.use('/api/landings',     landingsRouter)
app.use('/api',              waAbtestsRouter)
app.use('/api/analytics',    analyticsV2Router)
app.use('/api/reports',      reportsRouter)
app.use('/api/marketplace',  marketplaceRouter)
app.use('/api/agency',       agencyRouter)
app.use('/api/webhooks',     webhooksRouter)
app.use('/',                 docsRouter)
app.use('/api',             miscRouter)

app.get('/api/events', requireAuth, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.write(`event: connected\ndata: ${JSON.stringify({ user_id: req.user.sub, ts: new Date().toISOString() })}\n\n`)
  sseBroker.subscribe(req.user.sub, res)
})

export default app
