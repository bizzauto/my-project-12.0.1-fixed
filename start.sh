#!/bin/sh
# Startup script - runs prisma db push then starts server
set -e

# Debug: Show what env vars are available
echo "=== Redis Debug ==="
echo "REDIS_URL set: $([ -n \"$REDIS_URL\" ] && echo 'YES' || echo 'NO')"
echo "REDIS_PASSWORD set: $([ -n \"$REDIS_PASSWORD\" ] && echo 'YES' || echo 'NO')"
echo "REDIS_HOST set: $([ -n \"$REDIS_HOST\" ] && echo 'YES' || echo 'NO')"
echo "All env vars with REDIS: $(env | grep -i redis | head -5)"

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

echo "Redis URL present: $([ -n \"$REDIS_URL\" ] && echo 'YES' || echo 'NO')"
echo "Running Prisma DB push..."
timeout 60 npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Warning: Prisma DB push failed or timed out, continuing..."

echo "Starting server..."
exec node dist/server/index.js
