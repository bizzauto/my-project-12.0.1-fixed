FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install && npx prisma generate

COPY . .
RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache openssl wget

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY start.sh ./
RUN chmod +x start.sh

# Create necessary directories
RUN mkdir -p uploads logs

# Use PORT env var (default 4000)
ENV PORT=4000
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/health/live || exit 1

CMD ["./start.sh"]
