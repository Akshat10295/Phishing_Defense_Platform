#!/bin/sh
# SentinelAI REST Gateway Container Entrypoint
echo "[entrypoint] Checking and pushing database schema migrations via Prisma..."
npx prisma db push --accept-data-loss || echo "[entrypoint] Prisma migration failed, attempting launch anyway..."

echo "[entrypoint] Launching production Node server..."
exec node src/index.js
