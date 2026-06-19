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
const exists = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='User'\").all();

if (exists.length === 0) {
  const sql = fs.readFileSync('/app/schema.sql', 'utf8');
  db.exec(sql);
  console.log('[setup] Schema aplicado com sucesso');
} else {
  console.log('[setup] Schema ja existe, pulando...');
}
db.close();
"

echo "[setup] Iniciando servidor Next.js..."
exec node /app/server.js
