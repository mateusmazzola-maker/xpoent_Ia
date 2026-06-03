FROM node:20-alpine AS deps

WORKDIR /app

# Instalar dependências de sistema (mysqldump para backups)
RUN apk add --no-cache mysql-client

# Copy package files first (caching)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── Production stage ────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache mysql-client tini

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy app source
COPY . .

# Create directories for uploads and backups
RUN mkdir -p /app/uploads /app/backups && \
    addgroup -g 1001 -S xpoent && \
    adduser -u 1001 -S xpoent -G xpoent && \
    chown -R xpoent:xpoent /app

USER xpoent

EXPOSE 3000

# tini handles signals properly (PID 1)
ENTRYPOINT ["/sbin/tini", "--"]

# Healthcheck builtin
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "index.js"]
