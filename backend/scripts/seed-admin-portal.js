#!/usr/bin/env node
/**
 * Cria usuário super_admin inicial do painel IMPETUS (equipe interna).
 * Executar APÓS admin_portal_migration.sql
 *
 * Uso: node scripts/seed-admin-portal.js
 * Email padrão: admin@impetus.local
 * Senha padrão: 123456  → TROCAR EM PRODUÇÃO IMEDIATAMENTE
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const EMAIL = process.env.ADMIN_PORTAL_SEED_EMAIL || 'admin@impetus.local';
const PASSWORD = process.env.ADMIN_PORTAL_SEED_PASSWORD || '123456';

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
  console.log('[seed-admin-portal] ATENÇÃO: altere a senha padrão em produção (123456 é apenas desenvolvimento).');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
