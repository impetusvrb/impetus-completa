#!/usr/bin/env node
'use strict';

/**
 * Bootstrap Enterprise — instalação inicial quando BD vazia.
 * CERT-ONPREM-DATA-01
 *
 * Uso: node scripts/enterprise/bootstrap-enterprise.js [--dry-run]
 * Env: ENTERPRISE_BOOTSTRAP_* (ver CERT-ONPREM-DATA-01)
 */

const path = require('path');

require('../../src/config/loadEnv').loadImpetusEnv();

const db = require('../../src/db');
const { hashPassword } = require('../../src/middleware/auth');
const { ensureEnterpriseDirs } = require('../../src/config/impetusHome');

const DRY_RUN = process.argv.includes('--dry-run');

const CONFIG = {
  companyName: process.env.ENTERPRISE_BOOTSTRAP_COMPANY_NAME || 'Empresa Industrial',
  adminName: process.env.ENTERPRISE_BOOTSTRAP_ADMIN_NAME || 'Administrador',
  adminEmail: (process.env.ENTERPRISE_BOOTSTRAP_ADMIN_EMAIL || 'admin@impetus.local').toLowerCase(),
  adminPassword: process.env.ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD || '',
  planType: process.env.ENTERPRISE_BOOTSTRAP_PLAN_TYPE || 'enterprise',
};

async function tableExists(name) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return r.rows.length > 0;
}

async function countCompanies() {
  if (!(await tableExists('companies'))) return -1;
  const r = await db.query(`SELECT COUNT(*)::int AS c FROM companies WHERE active IS NOT FALSE`);
  return r.rows[0].c;
}

async function countUsers() {
  if (!(await tableExists('users'))) return -1;
  const r = await db.query(`SELECT COUNT(*)::int AS c FROM users WHERE deleted_at IS NULL`);
  return r.rows[0].c;
}

function validateConfig() {
  const errors = [];
  if (!CONFIG.adminEmail) errors.push('ENTERPRISE_BOOTSTRAP_ADMIN_EMAIL obrigatório');
  if (!CONFIG.adminPassword || CONFIG.adminPassword.length < 8) {
    errors.push('ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD mínimo 8 caracteres');
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(CONFIG.adminPassword)) {
    errors.push('Senha deve conter maiúscula, minúscula e número');
  }
  return errors;
}

async function createMinimalStructure(client, companyId, adminUserId) {
  const dept = await client.query(
    `INSERT INTO departments (company_id, name, description, level, type, active)
     VALUES ($1, $2, $3, 1, 'administrativo', true)
     RETURNING id`,
    [companyId, 'Direção Geral', 'Departamento raiz — bootstrap Enterprise']
  );
  const departmentId = dept.rows[0].id;

  const sector = await client.query(
    `INSERT INTO company_sectors (company_id, department_id, name, code, active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [companyId, departmentId, 'Direção', 'DIR']
  );
  const sectorId = sector.rows[0].id;

  let roleId = null;
  try {
    const role = await client.query(
      `INSERT INTO company_roles (
         company_id, name, hierarchy_level, department_id, sector_id, active,
         access_strategic_data, allow_manual_creation
       ) VALUES ($1, $2, 1, $3, $4, true, true, true)
       RETURNING id`,
      [companyId, 'Diretor Geral', departmentId, sectorId]
    );
    roleId = role.rows[0].id;
  } catch (e) {
    console.warn('[bootstrap] company_roles insert simplificado falhou:', e.message);
  }

  if (roleId) {
    await client.query(
      `UPDATE users SET company_role_id = $1, department_id = $2, is_company_root = true WHERE id = $3`,
      [roleId, departmentId, adminUserId]
    );
  } else {
    await client.query(`UPDATE users SET department_id = $1, is_company_root = true WHERE id = $2`, [
      departmentId,
      adminUserId,
    ]);
  }

  try {
    await client.query(
      `INSERT INTO tenant_admins (company_id, user_id, admin_type, status)
       VALUES ($1, $2, 'primary', 'active')
       ON CONFLICT DO NOTHING`,
      [companyId, adminUserId]
    );
  } catch (e) {
    if (e.code !== '42P01') console.warn('[bootstrap] tenant_admins:', e.message);
  }

  return { departmentId, sectorId, roleId };
}

async function main() {
  console.log('[bootstrap-enterprise] IMPETUS Enterprise bootstrap');
  ensureEnterpriseDirs();

  const companyCount = await countCompanies();
  if (companyCount < 0) {
    console.error('[bootstrap] Tabela companies inexistente — execute migrations primeiro.');
    process.exit(1);
  }
  if (companyCount > 0) {
    console.log('[bootstrap] Instalação existente detectada (%d empresa(s)). Nada alterado.', companyCount);
    process.exit(0);
  }

  const userCount = await countUsers();
  if (userCount > 0) {
    console.log('[bootstrap] Utilizadores existentes sem empresa — abortado por segurança.');
    process.exit(1);
  }

  const cfgErrors = validateConfig();
  if (cfgErrors.length) {
    console.error('[bootstrap] Configuração inválida:');
    cfgErrors.forEach((e) => console.error('  -', e));
    process.exit(1);
  }

  const existingEmail = await db.query(
    `SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
    [CONFIG.adminEmail]
  );
  if (existingEmail.rows.length) {
    console.error('[bootstrap] Email já existe:', CONFIG.adminEmail);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('[bootstrap] DRY-RUN — criaria empresa:', CONFIG.companyName, 'admin:', CONFIG.adminEmail);
    process.exit(0);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const companyResult = await client.query(
      `INSERT INTO companies (name, plan_type, subscription_tier, active, tenant_status)
       VALUES ($1, $2, $2, true, 'active')
       RETURNING id, name`,
      [CONFIG.companyName, CONFIG.planType]
    );
    const company = companyResult.rows[0];

    const passwordHash = hashPassword(CONFIG.adminPassword);
    const userResult = await client.query(
      `INSERT INTO users (
         company_id, name, email, password_hash, role,
         area, hierarchy_level, active, is_company_root, permissions
       ) VALUES ($1, $2, $3, $4, 'diretor', 'Direção', 1, true, true, $5)
       RETURNING id, email`,
      [company.id, CONFIG.adminName, CONFIG.adminEmail, passwordHash, JSON.stringify(['*'])]
    );
    const admin = userResult.rows[0];

    const structure = await createMinimalStructure(client, company.id, admin.id);

    await client.query('COMMIT');

    console.log('[bootstrap] OK');
    console.log('  company_id:', company.id);
    console.log('  company_name:', company.name);
    console.log('  admin_email:', admin.email);
    console.log('  department_id:', structure.departmentId);
    console.log('  sector_id:', structure.sectorId);
    console.log('  company_role_id:', structure.roleId || '(fallback)');
    console.log('[bootstrap] Altere a senha após primeiro login.');
    process.exit(0);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[bootstrap] ERRO:', e.message || e);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
