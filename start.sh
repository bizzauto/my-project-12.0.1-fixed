#!/bin/sh
# Startup script - runs prisma db push then starts server
set -e

echo "Running Prisma DB push..."
timeout 60 npx prisma db push --accept-data-loss 2>&1 || echo "Warning: Prisma DB push failed or timed out, continuing..."

echo "Starting server..."
exec node dist/server/index.js
