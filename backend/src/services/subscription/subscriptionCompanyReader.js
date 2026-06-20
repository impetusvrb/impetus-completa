'use strict';

/**
 * FIX-SUBSCRIPTION-UX-01 — leitura tenant-scoped de perfil de assinatura/empresa.
 * Adapta-se a colunas modernas (email_responsavel) e legado (data_controller_*).
 */

const db = require('../../db');

const BASE_COLS = ['id', 'name', 'active', 'subscription_status', 'plan_type', 'subscription_tier'];
const MODERN_COLS = ['email_responsavel', 'telefone_responsavel', 'nome_responsavel'];
const LEGACY_COLS = ['data_controller_email', 'data_controller_phone', 'data_controller_name', 'config'];

/** @type {Set<string>|null} */
let _columnCache = null;

async function _loadColumnSet() {
  if (_columnCache) return _columnCache;
  const r = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies'
  `);
  _columnCache = new Set((r.rows || []).map((row) => row.column_name));
  return _columnCache;
}

function _pickColumns(available, candidates) {
  return candidates.filter((c) => available.has(c));
}

/**
 * @param {string} companyId
 * @returns {Promise<object|null>}
 */
async function loadCompanyRow(companyId) {
  if (!companyId) return null;

  const available = await _loadColumnSet();
  const selectCols = [
    ...BASE_COLS,
    ..._pickColumns(available, MODERN_COLS),
    ..._pickColumns(available, LEGACY_COLS)
  ];

  const uniqueCols = [...new Set(selectCols.filter((c) => available.has(c)))];
  if (!uniqueCols.length) return null;

  const r = await db.query(
    `SELECT ${uniqueCols.join(', ')} FROM companies WHERE id = $1 LIMIT 1`,
    [companyId]
  );
  return r.rows[0] || null;
}

/**
 * Perfil UX para GET /companies/me e banner overdue.
 * @param {string} companyId
 */
async function getCompanySubscriptionUxProfile(companyId) {
  const row = await loadCompanyRow(companyId);
  if (!row) return null;

  const plan = row.plan_type || row.subscription_tier || '';

  return {
    id: row.id,
    name: row.name || '',
    active: row.active === true,
    subscription_status: row.subscription_status || '',
    subscription_plan: plan,
    _row: row
  };
}

function resetColumnCacheForTests() {
  _columnCache = null;
}

module.exports = {
  loadCompanyRow,
  getCompanySubscriptionUxProfile,
  resetColumnCacheForTests,
  BASE_COLS,
  MODERN_COLS,
  LEGACY_COLS
};
