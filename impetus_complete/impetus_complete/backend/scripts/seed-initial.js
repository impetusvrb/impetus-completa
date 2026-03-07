#!/usr/bin/env node
/**
 * Seed inicial - cria empresa demo, admin e internal_admin (se não existirem)
 * Uso: node -r dotenv/config scripts/seed-initial.js
 * 
 * Variáveis:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME, SEED_COMPANY_NAME
 *   SEED_INTERNAL_EMAIL, SEED_INTERNAL_PASSWORD, SEED_INTERNAL_NAME
 */
require('dotenv').config();
const db = require('../src/db');
const { hashPassword } = require('../src/middleware/auth');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@impetus.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Impetus@2025!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Administrador';
const COMPANY_NAME = process.env.SEED_COMPANY_NAME || 'Empresa Demo';

const INTERNAL_EMAIL = process.env.SEED_INTERNAL_EMAIL || 'comercial@impetus.local';
const INTERNAL_PASSWORD = process.env.SEED_INTERNAL_PASSWORD || 'Impetus@Comercial2025!';
const INTERNAL_NAME = process.env.SEED_INTERNAL_NAME || 'Equipe Comercial';

async function run() {
  console.log('Seed inicial...\n');

  try {
    let companyId = null;

    const comp = await db.query('SELECT id FROM companies WHERE name = $1 LIMIT 1', [COMPANY_NAME]);
    if (comp.rows.length === 0) {
      const r = await db.query(
        `INSERT INTO companies (name, active, subscription_tier, plan_type) VALUES ($1, true, 'essencial', 'essencial') RETURNING id`,
        [COMPANY_NAME]
      );
      companyId = r.rows[0].id;
      console.log('✓ Empresa criada:', COMPANY_NAME);
    } else {
      companyId = comp.rows[0].id;
    }

    const usr = await db.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [ADMIN_EMAIL]);
    if (usr.rows.length === 0) {
      const hash = hashPassword(ADMIN_PASSWORD);
      await db.query(
        `INSERT INTO users (name, email, password_hash, role, company_id, hierarchy_level, active)
         VALUES ($1, $2, $3, 'admin', $4, 1, true)`,
        [ADMIN_NAME, ADMIN_EMAIL, hash, companyId]
      );
      console.log('✓ Usuário admin criado:', ADMIN_EMAIL);
      console.log('  Senha:', ADMIN_PASSWORD, '(troque no primeiro acesso!)');
    } else {
      console.log('- Admin já existe:', ADMIN_EMAIL);
    }

    const internalUsr = await db.query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [INTERNAL_EMAIL]);
    if (internalUsr.rows.length === 0) {
      const hash = hashPassword(INTERNAL_PASSWORD);
      await db.query(
        `INSERT INTO users (name, email, password_hash, role, company_id, hierarchy_level, active)
         VALUES ($1, $2, $3, 'internal_admin', NULL, 1, true)`,
        [INTERNAL_NAME, INTERNAL_EMAIL, hash]
      );
      console.log('✓ Usuário internal_admin criado:', INTERNAL_EMAIL);
      console.log('  Senha:', INTERNAL_PASSWORD, '(acesso à rota /api/internal/sales/activate-client)');
    } else {
      console.log('- Internal admin já existe:', INTERNAL_EMAIL);
    }

    console.log('\n✓ Seed concluído.');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

run();
