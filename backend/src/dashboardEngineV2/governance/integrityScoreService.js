'use strict';

/**
 * OrganizationalContextIntegrityScore (OCIS)
 *
 * Mede a qualidade estrutural da identidade organizacional da empresa.
 * Reutiliza `contextIdentityAudit` + `dashboardPolicyEngine` + capabilities
 * derivadas — NÃO duplica lógica.
 *
 * Saída canónica:
 *   {
 *     overall_score, contextual_integrity, security_integrity,
 *     hierarchy_integrity, identity_quality, lgpd_alignment,
 *     risk_level, confidence,
 *     findings, recommendations, components,
 *     by_user, by_department, by_area, summary
 *   }
 *
 * Princípios:
 *   - READ-ONLY (não muta nada).
 *   - DETERMINÍSTICO (mesmo input → mesmo score).
 *   - EXPLICÁVEL (cada subscore tem componentes nomeados).
 *   - ADITIVO (encaixa na governança sem quebrar).
 */

const { auditUser } = require('../audit/contextIdentityAudit');
const { buildContextualIdentity } = require('../identity/identityResolver');
const { applyPolicies } = require('../policies/dashboardPolicyEngine');
const { ALL_CAPABILITIES } = require('../axes/capabilitiesDeriver');

// Severidades canónicas → peso negativo
const SEVERITY_WEIGHT = Object.freeze({
  high: 25,
  medium: 12,
  warn: 5,
  low: 2
});

const COMPONENT_WEIGHTS = Object.freeze({
  contextual_integrity: 0.25,
  security_integrity:   0.25,
  hierarchy_integrity:  0.15,
  identity_quality:     0.20,
  lgpd_alignment:       0.15
});

// Funções consideradas críticas para análise de hierarquia
const STRATEGIC_FUNCTIONS = new Set(['decisao_estrategica', 'analise', 'governanca']);
const LEADERSHIP_ROLES = new Set(['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor']);

function _clamp(n, min = 0, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function _round1(n) { return Math.round(n * 10) / 10; }

function _hierarchyConsistency(user, identity) {
  const hl = Number(user.hierarchy_level);
  const role = String(user.role || '').toLowerCase().trim();
  const fn = identity?.function_type;

  if (!Number.isFinite(hl)) {
    return { ok: false, severity: 'medium', reason: 'hierarchy_missing' };
  }

  if (LEADERSHIP_ROLES.has(role) && hl >= 5) {
    return { ok: false, severity: 'high', reason: 'leader_marked_as_collaborator' };
  }
  if (STRATEGIC_FUNCTIONS.has(fn) && hl >= 4 && role !== 'colaborador') {
    return { ok: false, severity: 'medium', reason: 'strategic_function_low_hierarchy' };
  }
  if (role === 'colaborador' && hl <= 2) {
    return { ok: false, severity: 'medium', reason: 'collaborator_marked_as_leader' };
  }
  return { ok: true };
}

function _ambiguityLevel(user, identity) {
  let amb = 0;
  if (identity?.sources?.function === 'fallback') amb += 1;
  if (identity?.sources?.area === 'context_interpreter' || identity?.sources?.area === 'fallback') amb += 1;
  if (!user?.role || String(user.role).trim().length < 2) amb += 1;
  if (!user?.functional_area && !user?.department) amb += 1;
  return amb; // 0..4
}

function _excessAccess(identity) {
  const caps = new Set(identity?.capabilities || []);
  const hl = Number(identity?.hierarchy_level);
  let excess = 0;
  if (Number.isFinite(hl) && hl >= 4 && caps.has('data:cross_sector')) excess += 1;
  if (Number.isFinite(hl) && hl >= 5 && caps.has('act:approve')) excess += 1;
  if (Number.isFinite(hl) && hl >= 5 && caps.has('act:configure')) excess += 1;
  return excess; // 0..3
}

function _underAccess(identity) {
  const caps = new Set(identity?.capabilities || []);
  let deficit = 0;
  if (!caps.has('view:operational')) deficit += 1;
  if (STRATEGIC_FUNCTIONS.has(identity?.function_type) && !caps.has('view:strategic')) deficit += 1;
  return deficit; // 0..2
}

function _identityQuality(user, identity) {
  let q = 100;
  if (!user.role || String(user.role).trim().length < 2) q -= 25;
  if (!user.job_title || String(user.job_title).trim().length < 2) q -= 15;
  if (!user.functional_area && !user.department) q -= 20;
  if (!Number.isFinite(Number(user.hierarchy_level))) q -= 15;
  if (identity?.sources?.area === 'context_interpreter') q -= 8;
  if (identity?.sources?.function === 'fallback') q -= 10;
  if (Array.isArray(user.permissions)) {
    const known = new Set(['*', 'VIEW_STRATEGIC', 'VIEW_FINANCIAL', 'VIEW_OPERATIONAL', 'VIEW_AUDIT_LOGS',
      'VIEW_SAFETY', 'VIEW_QUALITY', 'VIEW_HR', 'VIEW_DOCUMENTS', 'VIEW_DASHBOARD',
      'ACCESS_AI_ANALYTICS', 'MANAGE_USERS', 'EXPORT_DATA', 'ACCEPT_PROPOSALS', 'EXECUTE_TASKS']);
    const unknown = user.permissions.filter((p) => !known.has(String(p))).length;
    q -= Math.min(15, unknown * 3);
  }
  return _clamp(q);
}

function _lgpdAlignment(user, identity) {
  let s = 100;
  const caps = new Set(identity?.capabilities || []);
  const hl = Number(user.hierarchy_level);
  if (Number.isFinite(hl) && hl >= 4 && caps.has('data:cross_sector')) s -= 30;
  if (Number.isFinite(hl) && hl >= 5 && caps.has('data:export')) s -= 15;
  if (Array.isArray(user.permissions) && user.permissions.includes('*') && Number.isFinite(hl) && hl >= 3) s -= 25;
  if (caps.has('view:hr') && caps.has('view:financial') && Number.isFinite(hl) && hl >= 4) s -= 10;
  return _clamp(s);
}

function _securityIntegrity(user, identity, findings) {
  const excess = _excessAccess(identity);
  const lgpd = _lgpdAlignment(user, identity);
  const highFindings = findings.filter((f) => f.severity === 'high' && (f.kind === 'excess_access' || f.kind === 'capabilities_inconsistent')).length;
  const score = 100 - (excess * 18) - (highFindings * 10) - Math.max(0, 100 - lgpd) * 0.3;
  return _clamp(score);
}

function _contextualIntegrity(user, identity) {
  const amb = _ambiguityLevel(user, identity);
  const under = _underAccess(identity);
  const score = 100 - (amb * 14) - (under * 12);
  return _clamp(score);
}

function _hierarchyIntegrity(user, identity) {
  const cons = _hierarchyConsistency(user, identity);
  if (cons.ok) return 100;
  if (cons.severity === 'high') return 35;
  if (cons.severity === 'medium') return 65;
  return 80;
}

/**
 * Score completo de UM utilizador.
 */
function scoreUser(user) {
  if (!user) return null;
  const identity = buildContextualIdentity(user);
  const { identity: postPolicies } = applyPolicies({ identity, user });
  const findings = auditUser(user);

  const contextual_integrity = _contextualIntegrity(user, postPolicies);
  const security_integrity   = _securityIntegrity(user, postPolicies, findings);
  const hierarchy_integrity  = _hierarchyIntegrity(user, postPolicies);
  const identity_quality     = _identityQuality(user, postPolicies);
  const lgpd_alignment       = _lgpdAlignment(user, postPolicies);

  const overall_score = _round1(
    contextual_integrity * COMPONENT_WEIGHTS.contextual_integrity +
    security_integrity   * COMPONENT_WEIGHTS.security_integrity +
    hierarchy_integrity  * COMPONENT_WEIGHTS.hierarchy_integrity +
    identity_quality     * COMPONENT_WEIGHTS.identity_quality +
    lgpd_alignment       * COMPONENT_WEIGHTS.lgpd_alignment
  );

  let risk_level = 'low';
  if (overall_score < 50) risk_level = 'high';
  else if (overall_score < 70) risk_level = 'medium';
  else if (overall_score < 85) risk_level = 'warn';

  // Confiança: maior quando os campos críticos estão preenchidos
  const haveCore = !!(user.role && user.functional_area && Number.isFinite(Number(user.hierarchy_level)));
  const confidence = haveCore ? 0.9 : 0.6;

  // Recomendações curtas (não substitui ContextRecommendationEngine)
  const recommendations = [];
  if (hierarchy_integrity < 70) recommendations.push('Revisar hierarchy_level versus cargo estrutural.');
  if (identity_quality < 70) recommendations.push('Completar dados básicos do cadastro (role, job_title, functional_area).');
  if (security_integrity < 70) recommendations.push('Avaliar capabilities concedidas vs. princípio do menor privilégio.');
  if (lgpd_alignment < 70) recommendations.push('Reduzir capabilities sensíveis (data:cross_sector, data:export) em hierarquias baixas.');
  if (contextual_integrity < 70) recommendations.push('Reduzir ambiguidade — preencher área/departamento canónicos.');

  return {
    user_id: user.id ?? null,
    company_id: user.company_id ?? null,
    overall_score,
    contextual_integrity: _round1(contextual_integrity),
    security_integrity:   _round1(security_integrity),
    hierarchy_integrity:  _round1(hierarchy_integrity),
    identity_quality:     _round1(identity_quality),
    lgpd_alignment:       _round1(lgpd_alignment),
    risk_level,
    confidence,
    components: {
      ambiguity_level: _ambiguityLevel(user, identity),
      excess_access_count: _excessAccess(postPolicies),
      under_access_count: _underAccess(postPolicies),
      hierarchy_consistency: _hierarchyConsistency(user, postPolicies)
    },
    findings,
    recommendations,
    identity_signature: {
      role: user.role || null,
      function_type: identity?.function_type || null,
      area: identity?.area || null,
      hierarchy_level: user.hierarchy_level ?? null,
      capability_count: (postPolicies?.capabilities || []).length,
      capability_total: ALL_CAPABILITIES.length
    }
  };
}

function _avg(arr) {
  const xs = arr.filter((n) => Number.isFinite(n));
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function _aggregate(scores) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return null;
  }
  const components = ['overall_score', 'contextual_integrity', 'security_integrity', 'hierarchy_integrity', 'identity_quality', 'lgpd_alignment'];
  const out = {};
  for (const c of components) out[c] = _round1(_avg(scores.map((s) => s[c])));
  out.user_count = scores.length;
  out.high_risk_users = scores.filter((s) => s.risk_level === 'high').length;
  out.medium_risk_users = scores.filter((s) => s.risk_level === 'medium').length;
  out.healthy_users = scores.filter((s) => s.risk_level === 'low').length;
  return out;
}

/**
 * Score completo da organização (lote).
 *
 * @param {Iterable<object>} users
 * @returns {object} score consolidado
 */
function scoreOrganization(users) {
  const all = [];
  for (const u of users || []) {
    const s = scoreUser(u);
    if (s) all.push(s);
  }
  if (all.length === 0) {
    return {
      generated_at: new Date().toISOString(),
      overall_score: 100,
      contextual_integrity: 100,
      security_integrity: 100,
      hierarchy_integrity: 100,
      identity_quality: 100,
      lgpd_alignment: 100,
      risk_level: 'low',
      confidence: 0,
      total_users: 0,
      by_user: [],
      by_department: {},
      by_area: {},
      summary: { high_risk_users: 0, medium_risk_users: 0, healthy_users: 0 }
    };
  }

  const aggregate = _aggregate(all);

  const byArea = {};
  const byDept = {};
  for (const s of all) {
    const u = (Array.isArray(users) ? users : []).find((x) => x.id === s.user_id) || {};
    const area = s.identity_signature.area || 'unknown';
    const dept = u.department || u.department_resolved_name || 'unknown';
    if (!byArea[area]) byArea[area] = { scores: [], users: 0 };
    if (!byDept[dept]) byDept[dept] = { scores: [], users: 0 };
    byArea[area].scores.push(s); byArea[area].users += 1;
    byDept[dept].scores.push(s); byDept[dept].users += 1;
  }
  for (const k of Object.keys(byArea)) {
    byArea[k] = { ..._aggregate(byArea[k].scores), area: k };
  }
  for (const k of Object.keys(byDept)) {
    byDept[k] = { ..._aggregate(byDept[k].scores), department: k };
  }

  let risk_level = 'low';
  if (aggregate.overall_score < 50) risk_level = 'high';
  else if (aggregate.overall_score < 70) risk_level = 'medium';
  else if (aggregate.overall_score < 85) risk_level = 'warn';

  const confidence = _round1(_avg(all.map((s) => s.confidence)) * 100) / 100;

  return {
    generated_at: new Date().toISOString(),
    overall_score: aggregate.overall_score,
    contextual_integrity: aggregate.contextual_integrity,
    security_integrity: aggregate.security_integrity,
    hierarchy_integrity: aggregate.hierarchy_integrity,
    identity_quality: aggregate.identity_quality,
    lgpd_alignment: aggregate.lgpd_alignment,
    risk_level,
    confidence,
    total_users: all.length,
    by_user: all,
    by_department: byDept,
    by_area: byArea,
    summary: {
      high_risk_users: aggregate.high_risk_users,
      medium_risk_users: aggregate.medium_risk_users,
      healthy_users: aggregate.healthy_users
    }
  };
}

/**
 * Pontuação a partir do BD — usa o adaptador de DB existente.
 */
async function scoreFromDatabase(db, opts = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('scoreFromDatabase: parâmetro `db` inválido (esperado pg.Pool ou compat.)');
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
           u.hierarchy_level, u.permissions, u.dashboard_profile,
           d.name AS department_resolved_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
    ${where}
    ORDER BY u.id ASC
    LIMIT ${limit}
  `;
  const r = await db.query(sql, params);
  return scoreOrganization(r?.rows || []);
}

module.exports = {
  scoreUser,
  scoreOrganization,
  scoreFromDatabase,
  COMPONENT_WEIGHTS,
  SEVERITY_WEIGHT
};
