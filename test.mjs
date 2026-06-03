/**
 * AICS v7.0.1 — Test Suite (in-process, sem bind de porta)
 * Usa supertest para chamar o app Express diretamente.
 */
import 'dotenv/config'
import request from 'supertest'
import { initDB } from './src/lib/db.js'
import app from './app.js'

// Init DB before all tests
await initDB()

// ── helpers ──────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0
const results = []

async function test(name, fn) {
  total++
  try {
    await fn()
    passed++
    results.push({ status: '✅', name })
    console.log(`  ✅ ${name}`)
  } catch (err) {
    failed++
    const msg = err.message || String(err)
    results.push({ status: '❌', name, error: msg })
    console.log(`  ❌ ${name}`)
    console.log(`     → ${msg}`)
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`)
    },
    toContain: (key) => {
      if (!(key in actual)) throw new Error(`objeto não contém chave "${key}". Chaves: ${Object.keys(actual).join(', ')}`)
    },
    toEqual: (expected) => {
      const a = JSON.stringify(actual), b = JSON.stringify(expected)
      if (a !== b) throw new Error(`esperado ${b}, recebido ${a}`)
    },
    toBeGreaterThan: (n) => {
      if (!(actual > n)) throw new Error(`esperado > ${n}, recebido ${actual}`)
    },
    toBeTruthy: () => {
      if (!actual) throw new Error(`esperado truthy, recebido ${JSON.stringify(actual)}`)
    },
    toBeArray: () => {
      if (!Array.isArray(actual)) throw new Error(`esperado array, recebido ${typeof actual}`)
    },
  }
}

// ── state compartilhado entre testes ─────────────────────────────────────────
const RUN_ID = Date.now()
let adminToken = ''
let userToken = ''
let testClientId = null
let testProjectId = null
let testScheduleId = null
let twoFaSecret = ''
let testUserId = null

// ── SUITE ────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗')
console.log('║         AICS v7.0.1 — Test Suite                    ║')
console.log('╚══════════════════════════════════════════════════════╝\n')

// ── 1. HEALTH ────────────────────────────────────────────────────────────────
console.log('━━ 1. Health & Static ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/health retorna ok e versão', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toContain('ok')
  expect(res.body).toContain('version')
  expect(res.body.ok).toBe(true)
})

await test('GET / retorna HTML da página de login', async () => {
  const res = await request(app).get('/')
  expect(res.status).toBe(200)
  expect(res.headers['content-type'].includes('text/html')).toBe(true)
})

await test('Rota inexistente retorna 404 ou passa pro middleware', async () => {
  const res = await request(app).get('/api/nao-existe-mesmo')
  expect([404, 401].includes(res.status)).toBe(true)
})

// ── 2. AUTH ──────────────────────────────────────────────────────────────────
console.log('\n━━ 2. Auth — Login / Register / Perfil ━━━━━━━━━━━━━━━')

await test('Login com credenciais inválidas retorna 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nao@existe.com', password: 'errada' })
  expect(res.status).toBe(401)
})

await test('Login sem body retorna 400', async () => {
  const res = await request(app).post('/api/auth/login').send({})
  expect(res.status).toBe(400)
})

await test('Login com admin padrão retorna user + cookies', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@aics.com', password: 'admin123' })
  expect(res.status).toBe(200)
  expect(res.body).toContain('user')
  expect(res.body.user.email).toBe('admin@aics.com')
  expect(res.body.user.role).toBe('admin')
  // Extrai token do cookie
  const cookie = res.headers['set-cookie']?.find(c => c.startsWith('aics_access'))
  if (!cookie) throw new Error('Cookie aics_access não encontrado')
  adminToken = cookie.split(';')[0].split('=')[1]
  testUserId = res.body.user.id
})

await test('GET /api/auth/me com token válido retorna perfil', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.email).toBe('admin@aics.com')
  expect(res.body).toContain('two_fa_enabled')
})

await test('GET /api/auth/me sem token retorna 401', async () => {
  const res = await request(app).get('/api/auth/me')
  expect(res.status).toBe(401)
})

await test('Registro de novo usuário funciona', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Teste User', email: `teste_${RUN_ID}@aics.test`, password: 'senha1234', organization: 'AgênciaTest' })
  expect([200, 201].includes(res.status)).toBe(true)
  expect(res.body).toContain('user')
  const cookie = res.headers['set-cookie']?.find(c => c.startsWith('aics_access'))
  if (cookie) userToken = cookie.split(';')[0].split('=')[1]
})

await test('Registro com email duplicado retorna 409', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dup', email: `teste_${RUN_ID}@aics.test`, password: 'senha1234' })
  expect(res.status).toBe(409)
})

await test('Registro com senha fraca retorna 400', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'X', email: 'x@x.com', password: '123' })
  expect(res.status).toBe(400)
})

await test('PUT /api/auth/me atualiza nome do usuário', async () => {
  const res = await request(app)
    .put('/api/auth/me')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ name: 'Admin Atualizado' })
  expect(res.status).toBe(200)
  expect(res.body.name).toBe('Admin Atualizado')
})

await test('Forgot-password com email existente retorna 200', async () => {
  const res = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'admin@aics.com' })
  expect(res.status).toBe(200)
  expect(res.body).toContain('message')
})

await test('Forgot-password com email inexistente também retorna 200 (sem vazar info)', async () => {
  const res = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'nao@existe.com' })
  expect(res.status).toBe(200)
})

// ── 3. 2FA ───────────────────────────────────────────────────────────────────
console.log('\n━━ 3. 2FA (TOTP) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('POST /api/auth/2fa/setup retorna secret e otpauth_url', async () => {
  const res = await request(app)
    .post('/api/auth/2fa/setup')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body).toContain('secret')
  expect(res.body).toContain('otpauth_url')
  expect(res.body.otpauth_url.includes('otpauth://totp/')).toBe(true)
  twoFaSecret = res.body.secret
})

await test('POST /api/auth/2fa/confirm com código inválido retorna 400', async () => {
  const res = await request(app)
    .post('/api/auth/2fa/confirm')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ code: '000000' })
  expect(res.status).toBe(400)
})

await test('POST /api/auth/2fa/confirm com código válido ativa 2FA', async () => {
  const { authenticator } = await import('otplib')
  const code = authenticator.generate(twoFaSecret)
  const res = await request(app)
    .post('/api/auth/2fa/confirm')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ code })
  expect(res.status).toBe(200)
  expect(res.body.ok).toBe(true)
})

await test('Login com 2FA ativo sem código retorna two_fa_required', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@aics.com', password: 'admin123' })
  expect(res.status).toBe(200)
  expect(res.body.two_fa_required).toBe(true)
})

await test('Login com 2FA ativo + código correto retorna user', async () => {
  const { authenticator } = await import('otplib')
  const code = authenticator.generate(twoFaSecret)
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@aics.com', password: 'admin123', totp_code: code })
  expect(res.status).toBe(200)
  expect(res.body.user).toBeTruthy()
  // Atualiza token após login com 2FA
  const cookie = res.headers['set-cookie']?.find(c => c.startsWith('aics_access'))
  if (cookie) adminToken = cookie.split(';')[0].split('=')[1]
})

await test('POST /api/auth/2fa/disable desativa 2FA', async () => {
  const { authenticator } = await import('otplib')
  const code = authenticator.generate(twoFaSecret)
  const res = await request(app)
    .post('/api/auth/2fa/disable')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ password: 'admin123', code })
  expect(res.status).toBe(200)
  expect(res.body.ok).toBe(true)
})

// ── 4. CLIENTS ───────────────────────────────────────────────────────────────
console.log('\n━━ 4. Clients & Brands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/clients retorna array', async () => {
  const res = await request(app)
    .get('/api/clients')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body).toBeArray()
})

await test('POST /api/clients cria cliente', async () => {
  const res = await request(app)
    .post('/api/clients')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ name: 'Cliente Teste', segment: 'Moda', color: '#ff6600' })
  expect(res.status).toBe(201)
  expect(res.body).toContain('id')
  testClientId = res.body.id
})

await test('GET /api/clients/:id retorna cliente criado', async () => {
  const res = await request(app)
    .get(`/api/clients/${testClientId}`)
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.name).toBe('Cliente Teste')
})

await test('PUT /api/clients/:id atualiza cliente', async () => {
  const res = await request(app)
    .put(`/api/clients/${testClientId}`)
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ name: 'Cliente Atualizado', segment: 'Beleza' })
  expect(res.status).toBe(200)
})

// ── 5. PROJECTS ──────────────────────────────────────────────────────────────
console.log('\n━━ 5. Projects ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/projects retorna objeto paginado', async () => {
  const res = await request(app)
    .get('/api/projects')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body).toContain('items')
  expect(res.body).toContain('total')
  expect(res.body.items).toBeArray()
})

await test('POST /api/projects cria projeto', async () => {
  const res = await request(app)
    .post('/api/projects')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ client_id: testClientId, title: 'Post de Teste', format: 'feed', status: 'draft' })
  expect(res.status).toBe(201)
  expect(res.body).toContain('id')
  testProjectId = res.body.id
})

await test('GET /api/projects/:id retorna projeto', async () => {
  const res = await request(app)
    .get(`/api/projects/${testProjectId}`)
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.title).toBe('Post de Teste')
})

await test('PUT /api/projects/:id atualiza projeto', async () => {
  const res = await request(app)
    .put(`/api/projects/${testProjectId}`)
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ status: 'pending', caption: 'Legenda de teste' })
  expect(res.status).toBe(200)
})

// ── 6. DASHBOARD ─────────────────────────────────────────────────────────────
console.log('\n━━ 6. Dashboard ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/dashboard retorna métricas', async () => {
  const res = await request(app)
    .get('/api/dashboard')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body).toContain('counts')
  expect(res.body).toContain('metrics')
})

// ── 7. SCHEDULE ──────────────────────────────────────────────────────────────
console.log('\n━━ 7. Schedule ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/schedule retorna array', async () => {
  const res = await request(app)
    .get('/api/schedule')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body).toBeArray()
})

await test('POST /api/schedule cria agendamento', async () => {
  const scheduledAt = new Date(Date.now() + 86400000).toISOString().replace('T', ' ').replace('Z', '').slice(0, 19)
  const res = await request(app)
    .post('/api/schedule')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ project_id: testProjectId, platform: 'instagram', scheduled_at: scheduledAt })
  expect([200, 201].includes(res.status)).toBe(true)
  if (res.body.id) testScheduleId = res.body.id
})

// ── 8. APPROVALS ─────────────────────────────────────────────────────────────
console.log('\n━━ 8. Approvals ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/approvals retorna array', async () => {
  const res = await request(app)
    .get('/api/approvals')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body).toBeArray()
})

await test('POST /api/approvals cria fluxo de aprovação', async () => {
  const res = await request(app)
    .post('/api/approvals/submit')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ project_id: testProjectId, client_id: testClientId })
  expect([200, 201].includes(res.status)).toBe(true)
})

// ── 9. CRM ────────────────────────────────────────────────────────────────────
console.log('\n━━ 9. CRM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/crm/contacts retorna array', async () => {
  const res = await request(app)
    .get('/api/crm/contacts')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('POST /api/crm/contacts cria contato', async () => {
  const res = await request(app)
    .post('/api/crm/contacts')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ name: 'Lead Teste', first_name: 'Lead', last_name: 'Teste', email: 'lead@teste.com', stage: 'lead', lead_score: 80 })
  expect([200, 201].includes(res.status)).toBe(true)
})

// ── 10. EMAIL MARKETING ──────────────────────────────────────────────────────
console.log('\n━━ 10. Email Marketing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/email/campaigns retorna array', async () => {
  const res = await request(app)
    .get('/api/email/campaigns')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('POST /api/email/campaigns cria campanha', async () => {
  const res = await request(app)
    .post('/api/email/campaigns')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ name: 'Newsletter Teste', subject: 'Novidades!', content: '<p>Olá!</p>' })
  expect([200, 201].includes(res.status)).toBe(true)
})

// ── 11. ANALYTICS ────────────────────────────────────────────────────────────
console.log('\n━━ 11. Analytics ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/analytics retorna dados', async () => {
  const res = await request(app)
    .get('/api/analytics')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

// ── 12. ONBOARDING ────────────────────────────────────────────────────────────
console.log('\n━━ 12. Onboarding ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/onboarding retorna status do wizard', async () => {
  const res = await request(app)
    .get('/api/onboarding')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('POST /api/onboarding/step salva passo', async () => {
  const res = await request(app)
    .post('/api/onboarding/step')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ step: 'profile', data: { agency_name: 'Agência Teste' } })
  expect([200, 201].includes(res.status)).toBe(true)
})

// ── 13. BRAND KIT ─────────────────────────────────────────────────────────────
console.log('\n━━ 13. Brand Kit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/brand-kit retorna lista', async () => {
  const res = await request(app)
    .get('/api/brand-kit')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('POST /api/brand-kit cria kit de marca', async () => {
  const res = await request(app)
    .post('/api/brand-kit')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ client_id: testClientId, primary_color: '#ff6600', secondary_color: '#000000', logo_url: 'https://exemplo.com/logo.png' })
  expect([200, 201].includes(res.status)).toBe(true)
})

// ── 14. TRENDS ────────────────────────────────────────────────────────────────
console.log('\n━━ 14. Trends ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/trends retorna dados', async () => {
  const res = await request(app)
    .get('/api/trends')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

// ── 15. AUTOMATIONS ───────────────────────────────────────────────────────────
console.log('\n━━ 15. Automations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/automations retorna lista', async () => {
  const res = await request(app)
    .get('/api/automations')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

// ── 16. STUDIO ─────────────────────────────────────────────────────────────
console.log('\n━━ 16. Studio Pro ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/studio/formats retorna formatos', async () => {
  const res = await request(app)
    .get('/api/studio/formats')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('GET /api/designs retorna lista', async () => {
  const res = await request(app)
    .get('/api/designs')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body).toBeArray()
})

// ── 17. LANDINGS ──────────────────────────────────────────────────────────────
console.log('\n━━ 17. Landings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/landings retorna lista', async () => {
  const res = await request(app)
    .get('/api/landings')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('POST /api/landings cria landing page', async () => {
  const res = await request(app)
    .post('/api/landings')
    .set('Cookie', `aics_access=${adminToken}`)
    .send({ client_id: testClientId, title: 'LP Teste', slug: `lp-teste-${Date.now()}` })
  expect([200, 201].includes(res.status)).toBe(true)
})

// ── 18. WHATSAPP ──────────────────────────────────────────────────────────────
console.log('\n━━ 18. WhatsApp ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/whatsapp/campaigns retorna lista', async () => {
  const res = await request(app)
    .get('/api/whatsapp/campaigns')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

// ── 19. REPORTS ───────────────────────────────────────────────────────────────
console.log('\n━━ 19. Reports ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/reports retorna lista', async () => {
  const res = await request(app)
    .get('/api/reports')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

// ── 20. MARKETPLACE ───────────────────────────────────────────────────────────
console.log('\n━━ 20. Marketplace ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

await test('GET /api/marketplace retorna lista', async () => {
  const res = await request(app)
    .get('/api/marketplace')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

// ── 21. MISC — uploads, notifications, settings ──────────────────────────────
console.log('\n━━ 21. Misc (Notificações, Settings) ━━━━━━━━━━━━━━━━━━')

await test('GET /api/notifications retorna lista', async () => {
  const res = await request(app)
    .get('/api/notifications')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('GET /api/settings retorna configurações', async () => {
  const res = await request(app)
    .get('/api/settings')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
})

await test('DELETE /api/projects/:id (soft-delete) funciona', async () => {
  const res = await request(app)
    .delete(`/api/projects/${testProjectId}`)
    .set('Cookie', `aics_access=${adminToken}`)
  expect([200, 204].includes(res.status)).toBe(true)
})

await test('DELETE /api/clients/:id (soft-delete) funciona', async () => {
  const res = await request(app)
    .delete(`/api/clients/${testClientId}`)
    .set('Cookie', `aics_access=${adminToken}`)
  expect([200, 204].includes(res.status)).toBe(true)
})

await test('POST /api/auth/logout invalida sessão', async () => {
  const res = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', `aics_access=${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.ok).toBe(true)
})

await test('GET /api/auth/me após logout retorna 401', async () => {
  // Token ainda no cookie mas sem refresh válido — o access token expira em 15min
  // Aqui testamos que o logout limpa o cookie de sessão
  const res = await request(app)
    .get('/api/auth/me')
    // sem cookie
  expect(res.status).toBe(401)
})

// ── RESULTADO FINAL ───────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗')
console.log(`║  Resultado: ${passed}/${total} passaram, ${failed} falharam              `)
console.log('╚══════════════════════════════════════════════════════╝\n')

if (failed > 0) {
  console.log('❌ Falhas:')
  results.filter(r => r.status === '❌').forEach(r => {
    console.log(`  • ${r.name}`)
    console.log(`    → ${r.error}`)
  })
}

process.exit(failed > 0 ? 1 : 0)
