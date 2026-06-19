#!/bin/sh
set -e

echo "[setup] Inicializando banco de dados..."
node --experimental-sqlite --no-warnings -e "
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL.replace(/^file:/, '');
const dbFile = path.isAbsolute(dbUrl) ? dbUrl : path.join(process.cwd(), dbUrl);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new DatabaseSync(dbFile);
db.exec(fs.readFileSync('/app/prisma/schema.sql', 'utf8'));
console.log('[setup] Schema aplicado');
db.close();
"

echo "[setup] Iniciando servidor Next.js..."
exec node /app/server.js
