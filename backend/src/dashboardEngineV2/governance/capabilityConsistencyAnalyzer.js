'use strict';

/**
 * CapabilityConsistencyAnalyzer
 *
 * Avalia o estado das capabilities canónicas do sistema:
 *   - capabilities redundantes (ex.: dois caminhos para o mesmo efeito)
 *   - capabilities conflitantes (ex.: deny + allow)
 *   - capabilities nunca usadas
 *   - capabilities excessivamente permissivas (concedidas a > N% dos users)
 *   - capabilities sem policy associada
 *
 * Também produz:
 *   - capability_map           : por capability → { in_users, in_policies }
 *   - dependencies             : mapa explícito declarado (mantido aqui)
 *   - coverage_by_function     : por function_type → capabilities cobertas
 *   - matrix_cap_function_area : matriz tridimensional para auditoria
 *
 * Regras:
 *   - READ-ONLY (não modifica nada)
 *   - DETERMINÍSTICO
 *   - usa POLICY_CATALOG, IMPLICIT_BY_FUNCTION_AREA, ALL_CAPABILITIES
 */

const {
  ALL_CAPABILITIES,
  IMPLICIT_BY_FUNCTION_AREA,
  PERMISSION_TO_CAPABILITIES
} = require('../axes/capabilitiesDeriver');
const { POLICY_CATALOG } = require('../policies/policyCatalog');
const { buildContextualIdentity } = require('../identity/identityResolver');
const { applyPolicies } = require('../policies/dashboardPolicyEngine');

const FUNCTION_TYPES = Object.freeze(['decisao_estrategica', 'analise', 'supervisao', 'execucao', 'governanca']);
const AREAS = Object.freeze([
  'finance', 'operations', 'industrial', 'production', 'maintenance',
  'quality', 'hr', 'pcp', 'admin', 'logistics', 'safety'
]);

// Dependências declaradas (regra: se A é concedida, B é coerente conceder)
const CAPABILITY_DEPENDENCIES = Object.freeze({
  'data:cross_sector':  ['view:operational'],
  'data:export':        ['view:operational'],
  'act:approve':        ['view:operational'],
  'act:configure':      ['view:operational'],
  'act:execute':        ['view:operational'],
  'view:strategic':     ['view:operational'],
  'view:audit':         ['view:operational'],
  'view:financial':     [],
  'view:hr':            [],
  'view:safety':        ['view:operational'],
  'view:quality':       ['view:operational'],
  'view:logistics':     ['view:operational'],
  'view:maintenance':   ['view:operational']
});

function _coverageByFunction() {
  const out = {};
  for (const fn of FUNCTION_TYPES) {
    const set = new Set();
    const byArea = IMPLICIT_BY_FUNCTION_AREA[fn] || {};
    for (const a of Object.keys(byArea)) {
      for (const c of byArea[a] || []) set.add(c);
    }
    out[fn] = Array.from(set).sort();
  }
  return out;
}

function _capabilitiesInPolicies() {
  const used = new Set();
  for (const p of POLICY_CATALOG) {
    if (Array.isArray(p.capabilities)) for (const c of p.capabilities) used.add(c);
  }
  return used;
}

function _detectConflictingPolicies() {
  // Conflito: mesmo applies_to + capabilities sobrepostas com effects opostos
  const conflicts = [];
  for (let i = 0; i < POLICY_CATALOG.length; i++) {
    for (let j = i + 1; j < POLICY_CATALOG.length; j++) {
      const a = POLICY_CATALOG[i], b = POLICY_CATALOG[j];
      const aCaps = new Set(a.capabilities || []);
      const bCaps = new Set(b.capabilities || []);
      const inter = [...aCaps].filter((x) => bCaps.has(x));
      if (inter.length === 0) continue;
      const effA = a.effect, effB = b.effect;
      const opposite = (effA === 'deny' && effB !== 'deny') || (effB === 'deny' && effA !== 'deny');
      if (!opposite) continue;
      // Sobreposição: mesmo function_type ou mesma area
      const sameFn = a.applies_to?.function_type && a.applies_to.function_type === b.applies_to?.function_type;
      const aAreas = new Set(a.applies_to?.area_in || []);
      const bAreas = new Set(b.applies_to?.area_in || []);
      const sameArea = [...aAreas].some((x) => bAreas.has(x));
      if (sameFn || sameArea) {
        conflicts.push({
          policies: [a.id, b.id],
          overlapping_capabilities: inter,
          effects: [effA, effB]
        });
      }
    }
  }
  return conflicts;
}

/**
 * Analisa consistência baseando-se num lote de utilizadores.
 *
 * @param {Iterable<object>} users
 * @returns {object}
 */
function analyzeFromUsers(users) {
  const usersList = Array.from(users || []);
  const userCount = usersList.length;
  const inUsers = new Map(); // capability → count
  const matrix = {}; // capability × function × area

  for (const c of ALL_CAPABILITIES) {
    inUsers.set(c, 0);
    matrix[c] = {};
    for (const fn of FUNCTION_TYPES) {
      matrix[c][fn] = {};
      for (const a of AREAS) matrix[c][fn][a] = 0;
    }
  }

  for (const u of usersList) {
    const identity = buildContextualIdentity(u);
    const { identity: post } = applyPolicies({ identity, user: u });
    const fn = post.function_type;
    const area = post.area;
    for (const c of post.capabilities || []) {
      inUsers.set(c, (inUsers.get(c) || 0) + 1);
      if (matrix[c] && matrix[c][fn] && matrix[c][fn][area] !== undefined) {
        matrix[c][fn][area] += 1;
      }
    }
  }

  const inPolicies = _capabilitiesInPolicies();
  const coverage_by_function = _coverageByFunction();
  const conflicts = _detectConflictingPolicies();

  // Heurísticas de problema
  const PERMISSIVE_THRESHOLD = 0.6; // > 60% dos utilizadores
  const map = {};
  const issues = [];

  for (const c of ALL_CAPABILITIES) {
    const count = inUsers.get(c) || 0;
    const ratio = userCount > 0 ? count / userCount : 0;
    const coveredFunctions = FUNCTION_TYPES.filter((fn) => coverage_by_function[fn].includes(c));
    map[c] = {
      capability: c,
      in_users: count,
      ratio,
      in_policies: inPolicies.has(c),
      covered_functions: coveredFunctions,
      dependencies: CAPABILITY_DEPENDENCIES[c] || []
    };
    if (count === 0 && userCount > 0) {
      issues.push({ capability: c, kind: 'unused', detail: 'capability nunca atribuída a nenhum utilizador' });
    }
    if (ratio > PERMISSIVE_THRESHOLD && c.startsWith('act:')) {
      issues.push({ capability: c, kind: 'overpermissive', detail: `act:* concedida a ${(ratio * 100).toFixed(1)}% dos utilizadores` });
    }
    if (ratio > PERMISSIVE_THRESHOLD && c === 'data:cross_sector') {
      issues.push({ capability: c, kind: 'overpermissive', detail: `data:cross_sector concedida a ${(ratio * 100).toFixed(1)}% (LGPD)` });
    }
    if (!inPolicies.has(c)) {
      issues.push({ capability: c, kind: 'no_policy', detail: 'capability sem nenhuma policy associada' });
    }
  }

  // Redundâncias declaradas (efeito equivalente)
  // Heurística: capabilities cuja matriz é idêntica à de outra são redundantes
  // estruturalmente (apenas para alerta — não remove nada).
  const redundant_pairs = [];
  for (let i = 0; i < ALL_CAPABILITIES.length; i++) {
    for (let j = i + 1; j < ALL_CAPABILITIES.length; j++) {
      const c1 = ALL_CAPABILITIES[i], c2 = ALL_CAPABILITIES[j];
      const m1 = matrix[c1], m2 = matrix[c2];
      let equal = true;
      for (const fn of FUNCTION_TYPES) {
        for (const a of AREAS) {
          if ((m1[fn]?.[a] || 0) !== (m2[fn]?.[a] || 0)) { equal = false; break; }
        }
        if (!equal) break;
      }
      if (equal && (inUsers.get(c1) || 0) > 0) {
        redundant_pairs.push([c1, c2]);
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    total_users: userCount,
    capability_map: map,
    matrix_cap_function_area: matrix,
    coverage_by_function,
    conflicting_policies: conflicts,
    redundant_pairs,
    dependencies: CAPABILITY_DEPENDENCIES,
    issues
  };
}

async function analyzeFromDatabase(db, opts = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('analyzeFromDatabase: db inválido');
  }
  const limit = Math.max(1, Math.min(5000, Number(opts.limit) || 1000));
  const params = [];
  let where = '';
  if (opts.company_id) {
    params.push(opts.company_id);
    where = `WHERE u.company_id = $1`;
  }
  const sql = `
    SELECT u.id, u.company_id, u.role, u.job_title, u.functional_area, u.department,
           u.hierarchy_level, u.permissions, u.dashboard_profile
    FROM users u
    ${where}
    ORDER BY u.id ASC
    LIMIT ${limit}
  `;
  const r = await db.query(sql, params);
  return analyzeFromUsers(r?.rows || []);
}

module.exports = {
  analyzeFromUsers,
  analyzeFromDatabase,
  CAPABILITY_DEPENDENCIES,
  ALL_CAPABILITIES,
  PERMISSION_TO_CAPABILITIES,
  FUNCTION_TYPES,
  AREAS
};
