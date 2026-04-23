'use strict';

const db = require('../db');
const policyEngineService = require('./policyEngineService');

const POLICY_TYPES = policyEngineService.POLICY_TYPES;

function assertPolicyType(t) {
  const u = String(t || '').toUpperCase();
  if (!POLICY_TYPES.has(u)) {
    const e = new Error('policy_type inválido');
    e.code = 'INVALID_POLICY_TYPE';
    throw e;
  }
  return u;
}

/** Campos contextuais opcionais; normalizados em minúsculas no armazenamento. */
function sanitizePolicyContextField(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim().slice(0, 96);
  if (!s) return null;
  if (!/^[\w\-\.]+$/i.test(s)) {
    const e = new Error('module_name, user_role e operation_type: use apenas letras, números, _ e -');
    e.code = 'INVALID_POLICY_CONTEXT';
    throw e;
  }
  return s.toLowerCase();
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    company_id: row.company_id,
    sector: row.sector,
    country_code: row.country_code,
    policy_type: row.policy_type,
    rules: row.rules,
    is_active: row.is_active,
    module_name: row.module_name != null ? row.module_name : null,
    user_role: row.user_role != null ? row.user_role : null,
    operation_type: row.operation_type != null ? row.operation_type : null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function listPolicies({ companyId = null, superAdmin = false } = {}) {
  if (superAdmin) {
    if (companyId) {
      const r = await db.query(
        `SELECT * FROM ai_policies WHERE company_id = $1::uuid ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 500`,
        [companyId]
      );
      return r.rows.map(mapRow);
    }
    const r = await db.query(
      `SELECT * FROM ai_policies ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1000`
    );
    return r.rows.map(mapRow);
  }
  const r = await db.query(
    `SELECT * FROM ai_policies WHERE company_id = $1::uuid ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 200`,
    [companyId]
  );
  return r.rows.map(mapRow);
}

async function getById(id) {
  const r = await db.query(`SELECT * FROM ai_policies WHERE id = $1::uuid LIMIT 1`, [id]);
  return mapRow(r.rows[0]);
}

async function createPolicy(body, { tenantCompanyId = null, superAdmin = false } = {}) {
  const policy_type = assertPolicyType(body.policy_type);
  let company_id = body.company_id != null ? body.company_id : null;
  if (!superAdmin) {
    company_id = tenantCompanyId;
  }
  if (company_id) {
    const c = await db.query(`SELECT id FROM companies WHERE id = $1::uuid LIMIT 1`, [company_id]);
    if (!c.rows[0]) {
      const e = new Error('Empresa não encontrada');
      e.code = 'COMPANY_NOT_FOUND';
      throw e;
    }
  }
  const sector = body.sector != null ? String(body.sector).slice(0, 64) : null;
  const country_code =
    body.country_code != null ? String(body.country_code).toUpperCase().slice(0, 2) : null;
  const rules = body.rules && typeof body.rules === 'object' ? body.rules : {};
  const is_active = body.is_active !== false;
  const module_name = sanitizePolicyContextField(body.module_name);
  const user_role = sanitizePolicyContextField(body.user_role);
  const operation_type = sanitizePolicyContextField(body.operation_type);

  let r;
  try {
    r = await db.query(
      `
      INSERT INTO ai_policies (
        company_id, sector, country_code, policy_type, rules, is_active,
        module_name, user_role, operation_type
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        company_id,
        sector,
        country_code,
        policy_type,
        JSON.stringify(rules),
        is_active,
        module_name,
        user_role,
        operation_type
      ]
    );
  } catch (e) {
    if (e.code === '42703' || String(e.message || '').includes('module_name')) {
      r = await db.query(
        `
        INSERT INTO ai_policies (company_id, sector, country_code, policy_type, rules, is_active)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        RETURNING *
        `,
        [company_id, sector, country_code, policy_type, JSON.stringify(rules), is_active]
      );
    } else {
      throw e;
    }
  }
  policyEngineService.invalidateAll();
  return mapRow(r.rows[0]);
}

async function updatePolicy(id, body, { tenantCompanyId = null, superAdmin = false } = {}) {
  const prev = await getById(id);
  if (!prev) return null;
  if (!superAdmin) {
    if (!prev.company_id || String(prev.company_id) !== String(tenantCompanyId)) {
      const e = new Error('Política não pertence à sua empresa');
      e.code = 'POLICY_FORBIDDEN';
      throw e;
    }
  }

  const policy_type = body.policy_type != null ? assertPolicyType(body.policy_type) : prev.policy_type;
  let company_id = prev.company_id;
  if (superAdmin && body.company_id !== undefined) {
    company_id = body.company_id || null;
  }
  const sector = body.sector !== undefined ? (body.sector != null ? String(body.sector).slice(0, 64) : null) : prev.sector;
  const country_code =
    body.country_code !== undefined
      ? body.country_code != null
        ? String(body.country_code).toUpperCase().slice(0, 2)
        : null
      : prev.country_code;
  const rules = body.rules !== undefined && typeof body.rules === 'object' ? body.rules : prev.rules;
  const is_active = body.is_active !== undefined ? !!body.is_active : prev.is_active;
  const module_name =
    body.module_name !== undefined ? sanitizePolicyContextField(body.module_name) : prev.module_name;
  const user_role =
    body.user_role !== undefined ? sanitizePolicyContextField(body.user_role) : prev.user_role;
  const operation_type =
    body.operation_type !== undefined
      ? sanitizePolicyContextField(body.operation_type)
      : prev.operation_type;

  let r;
  try {
    r = await db.query(
      `
      UPDATE ai_policies SET
        company_id = $2,
        sector = $3,
        country_code = $4,
        policy_type = $5,
        rules = $6::jsonb,
        is_active = $7,
        module_name = $8,
        user_role = $9,
        operation_type = $10,
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING *
      `,
      [
        id,
        company_id,
        sector,
        country_code,
        policy_type,
        JSON.stringify(rules),
        is_active,
        module_name,
        user_role,
        operation_type
      ]
    );
  } catch (e) {
    if (e.code === '42703' || String(e.message || '').includes('module_name')) {
      r = await db.query(
        `
        UPDATE ai_policies SET
          company_id = $2,
          sector = $3,
          country_code = $4,
          policy_type = $5,
          rules = $6::jsonb,
          is_active = $7,
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING *
        `,
        [id, company_id, sector, country_code, policy_type, JSON.stringify(rules), is_active]
      );
    } else {
      throw e;
    }
  }
  policyEngineService.invalidateAll();
  return mapRow(r.rows[0]);
}

async function deletePolicy(id, { tenantCompanyId = null, superAdmin = false } = {}) {
  const prev = await getById(id);
  if (!prev) return null;
  if (!superAdmin) {
    if (!prev.company_id || String(prev.company_id) !== String(tenantCompanyId)) {
      const e = new Error('Política não pertence à sua empresa');
      e.code = 'POLICY_FORBIDDEN';
      throw e;
    }
  }
  await db.query(`DELETE FROM ai_policies WHERE id = $1::uuid`, [id]);
  policyEngineService.invalidateAll();
  return prev;
}

module.exports = {
  listPolicies,
  getById,
  createPolicy,
  updatePolicy,
  deletePolicy
};
