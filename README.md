# Xpoent

Plataforma de agência IA — sistema operacional completo para agências de marketing digital.

Substitui o stack tradicional: Trello + Canva + RD Station + Hootsuite + ContaAzul + Mailchimp + Stripe + suíte Google em uma plataforma única com IA nativa.

## Quick Start

```bash
git clone <repo> xpoent && cd xpoent
npm install
cp .env.example .env   # preencha DB_*, JWT_SECRET, ANTHROPIC_API_KEY
mysql -u root -p -e "CREATE DATABASE xpoent CHARACTER SET utf8mb4;"
npm start
# http://localhost:3000  ·  admin@xpoent.com / admin123
```

## Funcionalidades

**Núcleo** — multi-tenant, clientes, projetos, agendamento, aprovações, portal do cliente, onboarding wizard.

**Distribuição (8 redes)** — Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, X (Twitter), Google Meu Negócio, WhatsApp Cloud API.

**IA aplicada** — Claude (copy/legenda/roteiro/SEO/chatbot), Replicate (imagens), AssemblyAI (legendas), ElevenLabs (voz + clonagem), HeyGen (avatar IA).

**Comercial** — propostas com aceite digital, contratos com assinatura eletrônica, faturas, MRR/ARR, recorrências, webhook Stripe/Asaas.

**Analytics** — Meta Insights, LinkedIn, TikTok, YouTube, Pinterest, X, Meta Ads, Google Ads, GA4, monitoramento de concorrentes IA, relatórios PDF white-label.

**Crescimento** — marketplace de templates, programa de afiliados (20% recorrente), score de agência (Iniciante→Diamante), leaderboard, white-label com domínio customizado.

**Mobile** — PWA instalável (iOS/Android), service worker offline, push notifications.

**Infra** — JWT 2h+refresh 7d, 2FA TOTP, helmet, rate limiting, multi-tenant isolation, SSE real-time, backup automático cron, healthcheck profundo.

## Variáveis críticas

```env
# OBRIGATÓRIAS
DB_HOST=localhost
DB_USER=xpoent
DB_PASS=...
DB_NAME=xpoent
JWT_SECRET=...           # openssl rand -base64 48
APP_URL=https://app.xpoent.com
ANTHROPIC_API_KEY=sk-ant-...

# IA + IMAGENS
REPLICATE_API_TOKEN=r8_...
ASSEMBLYAI_API_KEY=...
ELEVENLABS_API_KEY=...
HEYGEN_API_KEY=...

# REDES SOCIAIS
META_APP_ID=...; META_APP_SECRET=...
WHATSAPP_TOKEN=...; WHATSAPP_PHONE_ID=...; WHATSAPP_WABA_ID=...
LINKEDIN_CLIENT_ID=...; LINKEDIN_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...; TIKTOK_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...; GOOGLE_CLIENT_SECRET=...; GOOGLE_ADS_DEVELOPER_TOKEN=...
PINTEREST_APP_ID=...; PINTEREST_APP_SECRET=...
TWITTER_CLIENT_ID=...; TWITTER_CLIENT_SECRET=...

# PAGAMENTOS
STRIPE_SECRET_KEY=sk_live_...; STRIPE_WEBHOOK_SECRET=whsec_...
# OU
ASAAS_API_KEY=...

# EMAIL
SMTP_HOST=...; SMTP_PORT=587; SMTP_USER=...; SMTP_PASS=...; SMTP_FROM=...

# STORAGE (opcional)
S3_BUCKET=...; S3_REGION=...; S3_ACCESS_KEY=...; S3_SECRET_KEY=...

# BACKUP
BACKUP_ENABLED=true
BACKUP_CRON=0 3 * * *
BACKUP_RETENTION_DAYS=30

# WHITE-LABEL
WHITELABEL_CNAME_TARGET=app.xpoent.com
```

Veja `.env.example` para a lista completa.

## Deploy

### Docker (recomendado)

```bash
docker compose up -d
```

### VPS Ubuntu manual

```bash
# 1. Servidor
sudo apt install -y nodejs npm mysql-server nginx certbot python3-certbot-nginx

# 2. Banco
sudo mysql -e "CREATE DATABASE xpoent;
  CREATE USER 'xpoent'@'localhost' IDENTIFIED BY 'SENHA_FORTE';
  GRANT ALL ON xpoent.* TO 'xpoent'@'localhost';"

# 3. App
cd /opt && sudo git clone <repo> xpoent && cd xpoent
sudo npm install --production
sudo cp .env.example .env && sudo nano .env

# 4. Process manager
sudo npm install -g pm2
pm2 start index.js --name xpoent
pm2 save && pm2 startup

# 5. SSL
sudo certbot --nginx -d app.xpoent.com
```

### Nginx config

```nginx
server {
  listen 443 ssl http2;
  server_name app.xpoent.com;
  client_max_body_size 100M;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # SSE precisa de buffering desligado
  location /api/events {
    proxy_pass http://localhost:3000;
    proxy_buffering off;
    proxy_cache off;
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
  }
}
```

## Healthcheck

```bash
curl https://app.xpoent.com/api/health        # liveness
curl https://app.xpoent.com/api/health/deep   # DB + AI + Meta + disk + memory
```

## Backup

Cron interno automático (`node-cron`). Default: 3am diário, retenção 30 dias.

```bash
# Manual
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://app.xpoent.com/api/admin/backup/run

# Restore
gunzip -c backups/xpoent-2026-04-24.sql.gz | mysql -u xpoent -p xpoent
```

## Estrutura

```
xpoent/
├── index.js                # Express entry point
├── public/
│   ├── index.html          # Landing + login (Syne, monocromático)
│   ├── app.html            # Dashboard (~7000 linhas)
│   ├── manifest.json       # PWA
│   ├── sw.js               # Service worker
│   └── icons/              # PWA icons
├── src/
│   ├── routes/             # 37 módulos de rotas (12.595 linhas)
│   ├── lib/                # db, ai, meta, whatsapp, scheduler, mailer...
│   └── middleware/         # auth + tenant
├── migrations/             # 10 sprints SQL (auto-aplicadas)
├── docs/openapi.yaml       # API spec OpenAPI 3
├── tests/                  # Jest + Playwright
└── .github/workflows/      # CI/CD
```

## Stack

Node.js 20 ESM · Express 4 · MySQL 8 · Anthropic Claude 4 Sonnet · Replicate · ElevenLabs · HeyGen · AssemblyAI · Pino · node-cron · Helmet · bcrypt · JWT · Zod · Multer · Nodemailer · Fabric.js

## Testes

```bash
npm test          # Jest unit tests
npm run test:e2e  # Playwright E2E
npm run lint      # ESLint
```

## Resumo

- **37 módulos de rotas** · **345+ endpoints** · **44 tabelas MySQL**
- **8 redes sociais** integradas com OAuth real
- **5 modelos de IA** (Claude, Flux, AssemblyAI, ElevenLabs, HeyGen)
- **PWA completo** (iOS/Android instalável)
- **Multi-tenant** com white-label e domínio customizado
- **100% código aberto** sob licença proprietária

## Licença

Proprietário. Todos os direitos reservados © 2026 Xpoent.

## Suporte

- Email: suporte@xpoent.com
- Docs: docs.xpoent.com
- Issues: github.com/xpoent/issues
