FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install && npx prisma generate

COPY . .

# Increase memory limit for Vite build (prevents OOM in Docker)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine

RUN apk add --no-cache openssl wget

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY start.sh ./
RUN chmod +x start.sh

# Create necessary directories with correct ownership
RUN mkdir -p uploads logs && chown -R appuser:appgroup /app

# Use PORT env var (default 4000)
ENV PORT=4000
ENV NODE_OPTIONS="--max-old-space-size=512"
EXPOSE ${PORT}

# Switch to non-root user
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/health/live || exit 1

CMD ["./start.sh"]
