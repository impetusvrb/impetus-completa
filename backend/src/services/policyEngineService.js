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
 * @returns {Promise<{ rules: object, layers: object[], policy_types: string[], policy_enforcement?: object }>}
 */
async function resolvePolicy(ctx) {
  const companyId = ctx.companyId || null;
  const sector = ctx.sector || null;
  const countryCode = (ctx.countryCode || '').toUpperCase().slice(0, 2) || null;
  const policyTypeFilter = ctx.policy_type ? String(ctx.policy_type).toUpperCase() : null;
  if (policyTypeFilter && !POLICY_TYPES.has(policyTypeFilter)) {
    const empty = {
      rules: {},
      layers: [],
      policy_types: [],
      policy_enforcement: { conflict_detected: false, resolved_by: null, affected_rules: [] }
    };
    return empty;
  }

  const key = cacheKey(['pol', companyId, sector, countryCode, policyTypeFilter || 'ALL']);
  const hit = cacheGet(key);
  if (hit) return hit;

  let r;
  try {
    r = await db.query(
      `SELECT id, company_id, sector, country_code, policy_type, rules, is_active
       FROM ai_policies
       WHERE is_active = true
       ORDER BY created_at ASC`
    );
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
  const candidates = r.rows.filter((row) => rowMatchesContext(row, matchCtx));
  if (policyTypeFilter) {
    const filtered = candidates.filter((row) => row.policy_type === policyTypeFilter);
    filtered.sort((a, b) => specificityScore(a) - specificityScore(b));
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
        keys: Object.keys(piece)
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

  candidates.sort((a, b) => specificityScore(a) - specificityScore(b));
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
      keys: Object.keys(piece)
    });
  }
  const out = { rules, layers, policy_types: [...types], policy_enforcement: policyEnforcementAll };
  cacheSet(key, out);
  return out;
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
async function resolveEffectivePolicy({ companyId, sector, countryCode }) {
  return resolvePolicy({ companyId, sector, countryCode });
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
  resolveEffectivePolicy,
  isModuleAllowed,
  invalidateAll,
  invalidateCompany,
  specificityScore
};
