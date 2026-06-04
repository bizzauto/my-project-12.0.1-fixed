FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --no-audit --no-fund && npx prisma generate

COPY . .

# Google + NVIDIA + Gemini AI API Keys (public, not secrets)
ENV VITE_GOOGLE_CLIENT_ID=813332726800-sm0j12r7n1tcljokt027ac391t2ep73m.apps.googleusercontent.com
ENV GOOGLE_CLIENT_ID=813332726800-sm0j12r7n1tcljokt027ac391t2ep73m.apps.googleusercontent.com
ENV VITE_NVIDIA_NIM_API_KEY=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
ENV NVIDIA_NIM_API_KEY=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
ENV VITE_GEMINI_API_KEY=AIzaSyDummy REPLACE_ME

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build:docker && find dist -name "*.map" -delete

# ---- Production stage ----
FROM node:22-alpine

# Install Python + Edge TTS (Jimi natural voice - SwaraNeural)
RUN apk add --no-cache openssl wget python3 py3-pip && \
    pip3 install --break-system-packages edge-tts

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev --no-audit --no-fund && \
    npx prisma generate && \
    find /app/node_modules -type d -name "test" -o -name "tests" -o -name "__tests__" | xargs rm -rf 2>/dev/null; \
    npm cache clean --force && rm -rf /root/.npm

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY start.sh ./
RUN chmod +x start.sh

RUN mkdir -p uploads logs && chown -R appuser:appgroup uploads logs

ENV PORT=4000
ENV NODE_OPTIONS="--max-old-space-size=512"
EXPOSE ${PORT}

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/health/live || exit 1

CMD ["./start.sh"]
