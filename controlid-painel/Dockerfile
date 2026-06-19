FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

# ── Instala dependências ────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate
RUN pnpm build

# ── Imagem de produção ──────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone output do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma: schema para o CLI de migrações
COPY --from=builder /app/prisma ./prisma

# Cliente Prisma gerado (fora do node_modules padrão)
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# Binários nativos do libsql que o file tracer pode não capturar
COPY --from=builder /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# CLI do Prisma para rodar migrate no entrypoint
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Diretórios persistentes (serão volumes no Docker)
RUN mkdir -p /app/data /app/storage/photos && \
    chown -R nextjs:nodejs /app/data /app/storage

COPY --chmod=755 entrypoint.sh ./

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./entrypoint.sh"]
