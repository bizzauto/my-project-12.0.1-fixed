#!/bin/sh
# Startup script - runs prisma db push then starts server
set -e

# Auto-detect Redis from Docker network (Coolify uses coolify-redis)
if [ -z "$REDIS_HOST" ] || [ "$REDIS_HOST" = "localhost" ]; then
  export REDIS_HOST="coolify-redis"
  export REDIS_PORT="6379"
fi

# Build REDIS_URL only if not already set by Coolify
if [ -z "$REDIS_URL" ]; then
  if [ -n "$REDIS_PASSWORD" ]; then
    export REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
  else
    export REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
  fi
fi

echo "Redis URL: $(echo $REDIS_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/g')"
echo "Running Prisma DB push..."
timeout 60 npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Warning: Prisma DB push failed or timed out, continuing..."

echo "Starting server..."
exec node dist/server/index.js
