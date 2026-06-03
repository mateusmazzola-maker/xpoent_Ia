# AICS Studio — Instalação v7.0.0 (Plataforma Completa)

## Requisitos
- Node.js >= 18
- MySQL 8.0+
- (Opcional) Replicate API para geração de imagens com IA
- (Opcional) Anthropic API Key para IA de copy
- (Opcional) S3/R2 para armazenamento em nuvem

## Setup em 5 minutos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# Edite .env com suas credenciais (mínimo: DB_* e JWT_SECRET)

# 3. Subir o servidor (cria banco automaticamente)
npm start

# 4. Executar migrations (em outra aba)
mysql -u seu_user -p seu_banco < migrations/sprint2.sql
mysql -u seu_user -p seu_banco < migrations/sprint3.sql
mysql -u seu_user -p seu_banco < migrations/sprint4.sql
mysql -u seu_user -p seu_banco < migrations/sprint5.sql
mysql -u seu_user -p seu_banco < migrations/sprint6.sql
mysql -u seu_user -p seu_banco < migrations/sprint7_final.sql
```

## Acesso inicial
- URL: http://localhost:3000
- Admin: `admin@aics.com` / `admin123`
- ⚠️ Troque a senha no primeiro login

## Configuração de integrações (tudo opcional)

```env
# IA — Copy e análise
ANTHROPIC_API_KEY=sk-ant-api03-...

# IA — Geração de imagens
REPLICATE_API_TOKEN=r8_...

# E-mail
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM=noreply@seudominio.com

# Storage
S3_BUCKET=aics-uploads
S3_ENDPOINT=https://sua-conta.r2.cloudflarestorage.com
S3_KEY=...
S3_SECRET=...
S3_PUBLIC_URL=https://cdn.seudominio.com
```

## Módulos disponíveis (234 endpoints)

| Módulo | Rota base | Descrição |
|--------|-----------|-----------|
| Auth + Usuários | `/api/auth` | JWT, 2FA, perfil |
| Clientes + Brands | `/api/clients` | Multitenancy completo |
| Projetos | `/api/projects` | Feed, Stories, Reels |
| Canvas Studio Pro | `/api/studio` | Formatos, versões, share |
| Agendamento | `/api/schedule` | Posts + cron automático |
| Aprovações | `/api/approvals` | Fluxo cliente-agência |
| IA — Copy | `/api/generate` | 14 endpoints Claude |
| IA — Imagens | `/api/images` | Flux, SDXL, remove-bg, upscale |
| Brand Kit | `/api/brand-kit` | Paleta, fontes, análise de logo |
| SEO & Trends | `/api/trends` | Tendências, horários, análise |
| CRM | `/api/crm` | Pipeline Kanban, lead score |
| E-mail Marketing | `/api/email` | Campanhas, listas, A/B |
| WhatsApp | `/api/whatsapp` | Campanhas, inbox, chatbot |
| Automações | `/api/automations` | Flow builder + IA |
| Landing Pages | `/api/landings` | Builder, publish, analytics |
| A/B Tests | `/api/abtests` | Variações, winner, sugestão IA |
| Analytics | `/api/analytics` | Unificado, heatmap, funil |
| Relatórios | `/api/reports` | White-label, IA narrative, share |
| Marketplace | `/api/marketplace` | Templates gratuitos e premium |
| Agency Portal | `/api/agency` | White-label, equipe, billing |
| Webhooks | `/api/webhooks` | API pública |
| Documentação | `/api/docs` | Referência completa da API |

## Deploy

### Railway (recomendado)
1. Crie projeto com plugin MySQL
2. Configure variáveis de ambiente
3. Push do código → deploy automático
4. Execute migrations via Railway Shell

### VPS (PM2 + Nginx)
```bash
npm install -g pm2
pm2 start index.js --name aics
pm2 startup && pm2 save
```

---
*AICS v7.0.0 — Abril 2026 | Todas as 6 Fases do Roadmap: CONCLUÍDAS ✅*
