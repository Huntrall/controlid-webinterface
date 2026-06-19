#!/bin/sh
set -e

echo "[setup] Aplicando schema no banco de dados..."
node /app/node_modules/prisma/build/index.js db push --skip-generate

echo "[setup] Iniciando servidor Next.js..."
exec node /app/server.js
