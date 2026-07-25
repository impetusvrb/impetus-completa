#!/usr/bin/env node
/**
 * Cria usuário super_admin inicial do painel IMPETUS (equipe interna).
 * Executar APÓS admin_portal_migration.sql
 *
 * Uso: ADMIN_PORTAL_SEED_EMAIL=... ADMIN_PORTAL_SEED_PASSWORD=... node scripts/seed-admin-portal.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const EMAIL = String(process.env.ADMIN_PORTAL_SEED_EMAIL || '').trim();
const PASSWORD = String(process.env.ADMIN_PORTAL_SEED_PASSWORD || '');

if (!EMAIL || !PASSWORD) {
  throw new Error('ADMIN_PORTAL_SEED_CREDENTIALS_NOT_CONFIGURED');
}

async function main() {
  const hash = bcrypt.hashSync(PASSWORD, 12);
  const r = await db.query(`SELECT id FROM admin_users WHERE lower(email) = lower($1)`, [EMAIL]);
  if (r.rows.length) {
    console.log('[seed-admin-portal] Usuário já existe:', EMAIL);
    process.exit(0);
  }
  await db.query(
    `INSERT INTO admin_users (nome, email, senha_hash, perfil)
     VALUES ($1, $2, $3, 'super_admin')`,
    ['Administrador IMPETUS', EMAIL.toLowerCase(), hash]
  );
  console.log('[seed-admin-portal] Criado super_admin:', EMAIL);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
