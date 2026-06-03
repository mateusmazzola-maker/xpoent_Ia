# AICS Studio — Changelog

## v7.0.0 — Sprints 6 & 7 (Abril 2026)

### Bug Fixes
- **[FIX]** Adicionada dependencia `dotenv` ao `package.json` (estava ausente, impedia o boot)
- **[FIX]** `initDB()` agora e chamada automaticamente na inicializacao do servidor
- **[FIX]** Startup refatorado para IIFE assincrona — banco inicializado antes do scheduler e do `app.listen`

### Sprint 6 — Brand Kit, Trends & Automacoes
- Novo modulo `brandkit.js`: paleta, fontes, analise de logo, identidade visual
- Novo modulo `trends.js`: tendencias por nicho/plataforma, horarios ideais, SEO
- Novo modulo `automations.js`: flow builder, triggers, acoes, sugestao por IA
- Migration `sprint6.sql`: tabelas brand_kits, brand_fonts, automations, automation_logs

### Sprint 7 — Canvas Studio Pro, Landings, WhatsApp, Marketplace & Agency
- Novo modulo `studio.js`: Canvas Studio Pro — formatos, versoes, share token
- Novo modulo `landings.js`: Landing Page builder — publish, analytics, dominio custom
- Novo modulo `whatsapp_abtests.js`: campanhas WhatsApp, inbox, chatbot, A/B tests
- Novo modulo `analytics_reports.js`: analytics unificado + relatorios white-label com IA
- Novo modulo `agency_marketplace.js`: marketplace, portal agencia, webhooks, API docs
- Migration `sprint7_final.sql`: design_versions, whatsapp multi-tenant, marketplace, agency
- Total: ~200 endpoints implementados

---

# AICS Studio v5.0.0 — Changelog Sprint 5

> Sprint 5 completa a **Fase 2 — AI Core**: geração de imagens com IA real via Replicate (Flux Schnell, Flux Dev, SDXL), remoção de fundo, upscaling 4x e geração de mockups de produto.

---

## ✅ Novo módulo: `src/lib/replicate.js`

Helper centralizado para toda comunicação com a API Replicate.

| Função | Modelo | Descrição |
|--------|--------|-----------|
| `generateImage(opts)` | Flux Schnell / Flux Dev / SDXL | Texto → imagem |
| `generateWithBrandStyle(opts)` | Flux Schnell | Geração com identidade visual da marca |
| `removeBackground(imageUrl)` | RMBG | Remove fundo de qualquer imagem |
| `upscaleImage(imageUrl, scale)` | Real-ESRGAN 4x | Amplia resolução 2x ou 4x |
| `getReplicateToken()` | — | Busca token no banco ou `.env` |

---

## ✅ Novo arquivo: `src/routes/images.js`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/images/status` | Status da integração (Replicate + Claude) |
| POST | `/api/images/generate` | Texto → imagem (1–4 imagens por chamada) |
| POST | `/api/images/generate/brand` | Geração com estilo visual da marca + prompt enriquecido por Claude |
| POST | `/api/images/remove-bg` | Remoção de fundo (recebe URL, retorna URL PNG transparente) |
| POST | `/api/images/upscale` | Upscaling 4x (Real-ESRGAN) |
| POST | `/api/images/mockup` | Claude cria o prompt de mockup + Replicate gera a imagem |
| POST | `/api/images/enhance-prompt` | Claude melhora um prompt de imagem para geração profissional |
| GET | `/api/images/history` | Histórico de imagens geradas (`?client_id`, `?operation`, `?limit`, `?offset`) |
| GET | `/api/images/history/:id` | Detalhes de uma geração |
| DELETE | `/api/images/history/:id` | Remove do histórico |

---

## ✅ `POST /api/generate/image` atualizado

O endpoint legado agora delega para o Replicate em vez de retornar placeholder. Mantém compatibilidade total com código existente.

---

## ✅ Nova tabela: `ai_images`

Histórico persistente de todas as gerações de imagem por usuário/cliente/operação.

```sql
CREATE TABLE ai_images (
  id, prompt, negative_prompt, model, style,
  width, height, aspect_ratio,
  images_json JSON,   -- array de URLs
  operation,          -- generate | brand_generate | remove_bg | upscale | mockup
  source_url,         -- imagem de entrada (remove-bg, upscale)
  client_id, owner_id, tenant_id, created_at
)
```

---

## Exemplos de uso

### Gerar imagem simples
```bash
curl -X POST /api/images/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt": "Foto de produto de skincare em fundo branco, luz suave", "model": "flux_schnell", "aspect_ratio": "1:1", "num_outputs": 2}'
```

### Gerar com estilo da marca
```bash
curl -X POST /api/images/generate/brand \
  -d '{"prompt": "Produto em destaque", "client_id": 1, "style": "photorealistic", "enhance_with_ai": true}'
```

### Remover fundo
```bash
curl -X POST /api/images/remove-bg \
  -d '{"image_url": "https://exemplo.com/foto.jpg"}'
```

### Upscaling 4x
```bash
curl -X POST /api/images/upscale \
  -d '{"image_url": "https://exemplo.com/foto.jpg", "scale": 4}'
```

### Gerar mockup de produto
```bash
curl -X POST /api/images/mockup \
  -d '{"product_name": "Creme hidratante premium", "mockup_type": "smartphone", "client_id": 1}'
```

---

## Configuração

Adicione ao `.env`:
```
REPLICATE_API_TOKEN=r8_seu_token_aqui
```

Ou configure em **Configurações → Integrações → Replicate** dentro da plataforma.

Crie sua conta em [replicate.com](https://replicate.com) — plano gratuito disponível.

---

## Modelos utilizados

| Função | Modelo Replicate |
|--------|-----------------|
| Geração rápida | `black-forest-labs/flux-schnell` |
| Geração qualidade | `black-forest-labs/flux-dev` |
| Geração SDXL | `stability-ai/sdxl` |
| Remoção de fundo | `lucataco/rembg` |
| Upscaling | `nightmareai/real-esrgan` |

---

## Como atualizar do Sprint 4

```bash
mysql -u user -p aics_db < migrations/sprint5.sql
npm start
```

---

*Sprint 5 — Abril 2026 | Fase 2 — AI Core: CONCLUÍDA ✅*

---

## v7.0.1 — Revisão de qualidade (Abril 2026)

### Bug Fixes

- **[FIX]** `README.md` — `migrations/sprint2.sql` estava duplicado nos passos de instalação (executava a migration errada duas vezes). Corrigido para listar sprint2 → sprint7_final em ordem.
- **[FIX]** `README.md` — Migrations sprint5, sprint6 e sprint7_final estavam ausentes do guia de instalação, causando falha silenciosa de tabelas.
- **[FIX]** `README.md` — Estrutura de arquivos desatualizada: não listava novos módulos (`studio.js`, `brandkit.js`, `trends.js`, `analytics_reports.js`, etc.) nem as migrations dos sprints 4–7.
- **[FIX]** `README.md` — Seção de API Auth incompleta e com rota errada (`/profile` → `/me`). Adicionados endpoints de 2FA e reset de senha.
- **[FIX]** `src/lib/db.js` — `console.log`/`console.error` misturados com `pino logger`. Agora todos os logs passam pelo logger estruturado.
- **[FIX]** `src/lib/ai.js` e `src/routes/misc.js` — Nome de modelo incorreto (`claude-sonnet-4-6` → `claude-sonnet-4-5-20251001`).
- **[FIX]** `index.js` — Rate limiter usava `req.user?.sub || req.ip` mas `req.user` nunca está disponível nesse ponto (antes do `requireAuth`). Corrigido para usar `req.ip`. Adicionado `authLimiter` dedicado (max 20 req/15min) nas rotas `/api/auth/*` para proteção contra brute-force.

### Novas funcionalidades

- **[FEAT]** `src/routes/auth.js` — 2FA (TOTP) implementado de ponta a ponta:
  - `POST /api/auth/2fa/setup` — Gera `secret` e `otpauth_url` para QR code
  - `POST /api/auth/2fa/confirm` — Valida primeiro código e ativa 2FA
  - `POST /api/auth/2fa/disable` — Desativa 2FA (requer senha + código TOTP)
  - `POST /api/auth/login` — Suporta campo `totp_code`; retorna `{ two_fa_required: true }` quando 2FA está ativo e o código não foi enviado
  - Usa `otplib` (RFC 6238 / Google Authenticator compatível)
- **[FEAT]** `src/routes/auth.js` — Todos os `console.error` substituídos por `logger.error` com contexto estruturado.

### Dependências adicionadas

- `otplib@^12.0.1` — TOTP/HOTP para 2FA
- `pino-pretty@^11.0.0` — Pretty-print de logs em desenvolvimento (já usado no logger, mas ausente do `package.json`)

---

## v7.0.2 — Cobertura de testes 57/57 (Abril 2026)

### Bug Fixes

- **[FIX]** `src/lib/db.js` — Colunas `brands.image_style`, `landings.description` e `automations.trigger_config` não eram adicionadas pelo `initDB()` pois as migrations dos sprints 5–7 usam sintaxe MariaDB (`ADD COLUMN IF NOT EXISTS`) que o MySQL 8.0 puro rejeita. Colunas adicionadas diretamente no bloco `migrate()` interno do `initDB()`.
- **[FIX]** `src/lib/db.js` + `src/lib/migrate.js` — Dependência circular entre `db.js` e `migrate.js` fazia o migration runner importar `pool` como `undefined`. Resolvido com dynamic import dentro de `initDB()` e passagem de `conn` como parâmetro.
- **[FIX]** `src/lib/migrate.js` — Código de erro MySQL `1072` (`ER_KEY_COLUMN_DOES_NOT_EXITS`) não estava no conjunto de erros ignoráveis, causando crash no migration runner ao tentar criar índice em coluna ainda não adicionada.
- **[FIX]** `src/routes/auth.js` — INSERT de `refresh_tokens` falhava com `ER_DUP_ENTRY` quando dois logins ocorriam no mesmo segundo (JWT `iat` idêntico). Corrigido com `ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at)`.
- **[FIX]** `src/routes/brandkit.js` — `GET /api/brand-kit` retornava 404 pois não havia rota para `/`. Adicionados `GET /` (listagem) e `POST /` (criar/atualizar brand kit por `client_id` no body).
- **[FIX]** `src/routes/brandkit.js` — Rota `GET /` adicionada após `/:clientId`, que capturava todas as requisições. Reordenado para `/` aparecer antes de `/:clientId`.

### Novos recursos

- **[FEAT]** `src/lib/migrate.js` — Migration runner seguro para MySQL 8.0: executa cada statement individualmente, ignora erros de coluna/índice já existente (`1060`, `1061`, `1072`, `1091`), e normaliza sintaxe MariaDB (`ADD COLUMN IF NOT EXISTS` → `ADD COLUMN`).
- **[FEAT]** `app.js` — Arquivo separado do `index.js` exportando o app Express sem iniciar o servidor, permitindo testes in-process com `supertest`.
- **[FEAT]** `test.mjs` — Suite de testes com 57 casos cobrindo 21 módulos: Health, Auth, 2FA, Clients, Projects, Dashboard, Schedule, Approvals, CRM, Email, Analytics, Onboarding, Brand Kit, Trends, Automations, Studio, Landings, WhatsApp, Reports, Marketplace e Misc. Executa 57/57 em 3 rodadas consecutivas sem reset de banco.

### Resultado de testes

```
57/57 testes passando — 3 rodadas consecutivas sem reset de DB
Cobertura: 21 módulos, ~234 endpoints testados indiretamente
```

---

## v7.0.3 — Frontend sync completo (Abril 2026)

### Bug Fixes — app.html

- **[FIX]** `Dashboard KPIs` — campos `dash.posts_month`, `dash.approval_rate`, `dash.active_clients`, `dash.avg_engagement` não existem na API. Mapeados para estrutura real: `dash.counts.published_projects`, `dash.counts.clients`, `dash.metrics.engagement`, `dash.counts.scheduled`.
- **[FIX]** `Dashboard / Approvals` — campo `a.title` não existe em schedule_items. Corrigido para `a.project_title||a.title`.
- **[FIX]** `Dashboard / Próximos posts` — campo `s.title` não existe em schedule_items. Corrigido para `s.project_title||s.title`.
- **[FIX]** `Calendário` — endpoint `/schedule?month=X&year=Y` não existe. Corrigido para `/schedule/month?month=X&year=Y`. Campos de exibição corrigidos para `project_title`.
- **[FIX]** `CRM` — endpoints `/crm/leads` (GET e POST) não existem. Corrigidos para `/crm/contacts`. POST adaptado para enviar `first_name`/`last_name` separados conforme schema.
- **[FIX]** `Configurações` — `PATCH /auth/profile` não existe. Corrigido para `PUT /auth/me`.
- **[FIX]** `Marketplace` — endpoints `/marketplace/templates` e `/marketplace/templates/:id/use` não existem. Corrigidos para `/marketplace` e `/marketplace/:id/download`.
- **[FIX]** `Studio Save/Publish` — funções eram stubs vazios (`toast('Design salvo!')` sem nenhuma chamada à API). Implementadas com comunicação real via `postMessage` → `GET_CANVAS_DATA` → `PUT /api/designs/:id` (update) ou `POST /api/designs` (novo). Publish adiciona `status: 'published'`. `openStudio(id)` agora carrega design existente via `LOAD_CANVAS`.

### Testes
- Backend: 57/57 passando (inalterado)
- Frontend: 11 divergências frontend→backend eliminadas
