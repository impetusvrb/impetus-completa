'use strict';

/**
 * Resolução hierárquica de políticas: global → país → setor → empresa.
 * Cache por tenant + contexto; invalidação em mutações CRUD.
 */

const db = require('../db');
const { mergePoliciesWithHardening, unwrapRulesForEnforcement } = require('./policyHardeningService');

const POLICY_TYPES = new Set(['DATA_ACCESS', 'ANONYMIZATION', 'RESPONSE_LIMIT', 'COMPLIANCE']);

const TTL_MS = Math.min(
  600000,
  Math.max(5000, parseInt(process.env.AI_POLICY_CACHE_TTL_MS || '120000', 10))
);

/** @type {Map<string, { exp: number, value: unknown }>} */
const cache = new Map();

function cacheKey(parts) {
  return parts.map((p) => (p == null ? '_' : String(p))).join('|');
}

function cacheGet(key) {
  const row = cache.get(key);
  if (!row) return undefined;
  if (Date.now() > row.exp) {
    cache.delete(key);
    return undefined;
  }
  return row.value;
}

function cacheSet(key, value) {
  cache.set(key, { exp: Date.now() + TTL_MS, value });
}

function invalidateAll() {
  cache.clear();
}

function invalidateCompany(companyId) {
  if (!companyId) return;
  const prefix = `${companyId}|`;
  for (const k of cache.keys()) {
    if (k.includes(prefix) || k.startsWith(`${companyId}|`) || k.includes(`|${companyId}|`)) {
      cache.delete(k);
    }
  }
  for (const k of [...cache.keys()]) {
    if (k.includes(String(companyId))) cache.delete(k);
  }
}

function specificityScore(row) {
  let s = 0;
  if (row.company_id) s += 100;
  if (row.sector) s += 10;
  if (row.country_code) s += 1;
  return s;
}

function rowMatchesContext(row, ctx) {
  if (row.company_id && String(row.company_id) !== String(ctx.companyId)) return false;
  if (row.sector) {
    if (!ctx.sector || String(row.sector).toLowerCase() !== String(ctx.sector).toLowerCase()) {
      return false;
    }
  }
  if (row.country_code) {
    const cc = (ctx.countryCode || '').toUpperCase();
    if (!cc || String(row.country_code).toUpperCase() !== cc) return false;
  }
  return true;
}

/** Normaliza token de contexto para comparação (null = wildcard / ausente). */
function normalizePolicyToken(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.toLowerCase();
}

/**
 * Política entra no merge se cada dimensão contextual da linha for null OU igual ao pedido.
 * Linha com módulo definido não aplica quando o pedido não traz módulo compatível.
 */
function rowMatchesPolicyContext(row, policyCtx) {
  const rMod = normalizePolicyToken(row.module_name);
  const cMod = normalizePolicyToken(policyCtx.module_name);
  if (rMod != null && rMod !== cMod) return false;

  const rRole = normalizePolicyToken(row.user_role);
  const cRole = normalizePolicyToken(policyCtx.user_role);
  if (rRole != null && rRole !== cRole) return false;

  const rOp = normalizePolicyToken(row.operation_type);
  const cOp = normalizePolicyToken(policyCtx.operation_type);
  if (rOp != null && rOp !== cOp) return false;

  return true;
}

/**
 * Especificidade contextual (merge depois = mais específico): módulo > cargo > operação.
 */
function contextSpecificityScore(row) {
  let s = 0;
  if (normalizePolicyToken(row.module_name) != null) s += 100;
  if (normalizePolicyToken(row.user_role) != null) s += 40;
  if (normalizePolicyToken(row.operation_type) != null) s += 20;
  return s;
}

function comparePolicyRows(a, b) {
  const dh = specificityScore(a) - specificityScore(b);
  if (dh !== 0) return dh;
  const dc = contextSpecificityScore(a) - contextSpecificityScore(b);
  if (dc !== 0) return dc;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

async function loadActivePolicyRows() {
  try {
    const r = await db.query(
      `SELECT id, company_id, sector, country_code, policy_type, rules, is_active,
              module_name, user_role, operation_type
       FROM ai_policies
       WHERE is_active = true
       ORDER BY created_at ASC`
    );
    return r.rows;
  } catch (e) {
    if (e.code === '42703' || String(e.message || '').includes('module_name')) {
      const r2 = await db.query(
        `SELECT id, company_id, sector, country_code, policy_type, rules, is_active
         FROM ai_policies
         WHERE is_active = true
         ORDER BY created_at ASC`
      );
      return r2.rows.map((row) => ({
        ...row,
        module_name: null,
        user_role: null,
        operation_type: null
      }));
    }
    throw e;
  }
}

/**
 * @param {string|null|undefined} companyId
 * @returns {Promise<{ sector: string|null, countryCode: string|null }>}
 */
async function getCompanyPolicyContext(companyId) {
  const fallbackCountry = (process.env.DEFAULT_AI_POLICY_COUNTRY || 'BR').slice(0, 2).toUpperCase();
  if (!companyId) {
    return { sector: null, countryCode: fallbackCountry };
  }
  try {
    const r = await db.query(
      `SELECT ai_policy_sector, ai_policy_country FROM companies WHERE id = $1::uuid LIMIT 1`,
      [companyId]
    );
    const row = r.rows[0];
    return {
      sector: row?.ai_policy_sector ? String(row.ai_policy_sector).trim() || null : null,
      countryCode: row?.ai_policy_country
        ? String(row.ai_policy_country).trim().toUpperCase().slice(0, 2)
        : fallbackCountry
    };
  } catch (e) {
    if (String(e.message || '').includes('ai_policy')) {
      return { sector: null, countryCode: fallbackCountry };
    }
    throw e;
  }
}

/**
 * Carrega políticas ativas e faz merge com hardening (deep merge, locked rules, restritividade) por ordem crescente de especificidade.
 *
 * @param {object} ctx
 * @param {string} ctx.companyId
 * @param {string|null} ctx.sector
 * @param {string|null} ctx.countryCode
 * @param {string} [ctx.policy_type] — filtra tipo; omitido = todos os tipos fundidos num único objeto rules
 * @param {string|null} [ctx.module_name] — módulo da requisição (servidor)
 * @param {string|null} [ctx.user_role] — perfil/cargo (servidor; nunca do cliente para resolução)
 * @param {string|null} [ctx.operation_type] — tipo de operação (ex.: analysis, chat)
 * @returns {Promise<{ rules: object, layers: object[], policy_types: string[], policy_enforcement?: object }>}
 */
async function resolvePolicy(ctx) {
  const companyId = ctx.companyId || null;
  const sector = ctx.sector || null;
  const countryCode = (ctx.countryCode || '').toUpperCase().slice(0, 2) || null;
  const policyTypeFilter = ctx.policy_type ? String(ctx.policy_type).toUpperCase() : null;
  const policyCtx = {
    module_name: ctx.module_name,
    user_role: ctx.user_role,
    operation_type: ctx.operation_type
  };
  if (policyTypeFilter && !POLICY_TYPES.has(policyTypeFilter)) {
    const empty = {
      rules: {},
      layers: [],
      policy_types: [],
      policy_enforcement: { conflict_detected: false, resolved_by: null, affected_rules: [] }
    };
    return empty;
  }

  const key = cacheKey([
    'pol',
    companyId,
    sector,
    countryCode,
    policyTypeFilter || 'ALL',
    normalizePolicyToken(policyCtx.module_name) || '_',
    normalizePolicyToken(policyCtx.user_role) || '_',
    normalizePolicyToken(policyCtx.operation_type) || '_'
  ]);
  const hit = cacheGet(key);
  if (hit) return hit;

  let rows;
  try {
    rows = await loadActivePolicyRows();
  } catch (e) {
    if (String(e.message || '').includes('ai_policies')) {
      const empty = {
        rules: {},
        layers: [],
        policy_types: [],
        policy_enforcement: { conflict_detected: false, resolved_by: null, affected_rules: [] }
      };
      return empty;
    }
    throw e;
  }

  const matchCtx = { companyId, sector, countryCode };
  const candidates = rows
    .filter((row) => rowMatchesContext(row, matchCtx))
    .filter((row) => rowMatchesPolicyContext(row, policyCtx));

  if (policyTypeFilter) {
    const filtered = candidates.filter((row) => row.policy_type === policyTypeFilter);
    filtered.sort(comparePolicyRows);
    const pieces = filtered.map((row) => (row.rules && typeof row.rules === 'object' ? row.rules : {}));
    const { merged, policy_enforcement } = mergePoliciesWithHardening(pieces);
    const rules = unwrapRulesForEnforcement(merged);
    const layers = [];
    for (const row of filtered) {
      const piece = row.rules && typeof row.rules === 'object' ? row.rules : {};
      layers.push({
        id: row.id,
        policy_type: row.policy_type,
        scope: inferScopeLabel(row),
        keys: Object.keys(piece),
        module_name: row.module_name || null,
        user_role: row.user_role || null,
        operation_type: row.operation_type || null
      });
    }
    const out = {
      rules,
      layers,
      policy_types: [...new Set(filtered.map((x) => x.policy_type))],
      policy_enforcement
    };
    cacheSet(key, out);
    return out;
  }

  candidates.sort(comparePolicyRows);
  const piecesAll = candidates.map((row) => (row.rules && typeof row.rules === 'object' ? row.rules : {}));
  const { merged: mergedAll, policy_enforcement: policyEnforcementAll } = mergePoliciesWithHardening(piecesAll);
  const rules = unwrapRulesForEnforcement(mergedAll);
  const layers = [];
  const types = new Set();
  for (const row of candidates) {
    types.add(row.policy_type);
    const piece = row.rules && typeof row.rules === 'object' ? row.rules : {};
    layers.push({
      id: row.id,
      policy_type: row.policy_type,
      scope: inferScopeLabel(row),
      keys: Object.keys(piece),
      module_name: row.module_name || null,
      user_role: row.user_role || null,
      operation_type: row.operation_type || null
    });
  }
  const out = { rules, layers, policy_types: [...types], policy_enforcement: policyEnforcementAll };
  cacheSet(key, out);
  return out;
}

/**
 * Resolução com contexto explícito (módulo, cargo, operação). Campos omitidos = wildcard na chave e no filtro.
 */
async function resolvePolicyWithContext(params) {
  return resolvePolicy({
    companyId: params.company_id || params.companyId,
    sector: params.sector,
    countryCode: params.country_code || params.countryCode,
    policy_type: params.policy_type,
    module_name: params.module_name,
    user_role: params.user_role,
    operation_type: params.operation_type
  });
}

function inferScopeLabel(row) {
  if (row.company_id) return 'company';
  if (row.sector && row.country_code) return 'sector_country';
  if (row.sector) return 'sector';
  if (row.country_code) return 'country';
  return 'global';
}

/**
 * Resolve todas as políticas relevantes (atalho para o orquestrador).
 */
async function resolveEffectivePolicy({
  companyId,
  sector,
  countryCode,
  module_name,
  user_role,
  operation_type
} = {}) {
  return resolvePolicy({
    companyId,
    sector,
    countryCode,
    module_name,
    user_role,
    operation_type
  });
}

function isModuleAllowed(module, rules) {
  const list = rules?.allowed_modules;
  if (!Array.isArray(list) || list.length === 0) return true;
  const m = String(module || '').toLowerCase();
  return list.some((x) => m.includes(String(x || '').toLowerCase()));
}

module.exports = {
  POLICY_TYPES,
  TTL_MS,
  getCompanyPolicyContext,
  resolvePolicy,
  resolvePolicyWithContext,
  resolveEffectivePolicy,
  isModuleAllowed,
  invalidateAll,
  invalidateCompany,
  specificityScore,
  normalizePolicyToken,
  rowMatchesPolicyContext,
  contextSpecificityScore,
  comparePolicyRows
};
