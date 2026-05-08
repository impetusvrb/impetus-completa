'use strict';

/**
 * ContextRiskEngine
 *
 * Detector de riscos contextuais sobre identidade, acesso e organização.
 * Operacional, READ-ONLY, não modifica permissões — apenas relata.
 *
 * Cada risco emitido tem o formato canónico:
 *   {
 *     risk_id, type, severity, affected_users[], affected_areas[],
 *     probable_causes[], impact, recommendation, confidence, evidence{}
 *   }
 *
 * 10 detectores:
 *   1.  excess_privilege
 *   2.  underprivileged_critical_user
 *   3.  ambiguous_identity
 *   4.  orphan_permission
 *   5.  cross_area_inconsistency
 *   6.  hierarchy_anomaly
 *   7.  lgpd_exposure
 *   8.  context_mismatch
 *   9.  role_inflation
 *   10. permission_accumulation_over_time
 */

const crypto = require('crypto');
const { buildContextualIdentity } = require('../identity/identityResolver');
const { applyPolicies } = require('../policies/dashboardPolicyEngine');
const { ALL_CAPABILITIES, IMPLICIT_BY_FUNCTION_AREA } = require('../axes/capabilitiesDeriver');

const SEVERITY_ORDER = ['low', 'warn', 'medium', 'high', 'critical'];

const RISK_TYPES = Object.freeze({
  EXCESS_PRIVILEGE: 'excess_privilege',
  UNDERPRIVILEGED_CRITICAL_USER: 'underprivileged_critical_user',
  AMBIGUOUS_IDENTITY: 'ambiguous_identity',
  ORPHAN_PERMISSION: 'orphan_permission',
  CROSS_AREA_INCONSISTENCY: 'cross_area_inconsistency',
  HIERARCHY_ANOMALY: 'hierarchy_anomaly',
  LGPD_EXPOSURE: 'lgpd_exposure',
  CONTEXT_MISMATCH: 'context_mismatch',
  ROLE_INFLATION: 'role_inflation',
  PERMISSION_ACCUMULATION_OVER_TIME: 'permission_accumulation_over_time'
});

const KNOWN_PERMS = new Set([
  '*', 'VIEW_STRATEGIC', 'VIEW_FINANCIAL', 'VIEW_OPERATIONAL', 'VIEW_AUDIT_LOGS',
  'VIEW_SAFETY', 'VIEW_QUALITY', 'VIEW_HR', 'VIEW_DOCUMENTS', 'VIEW_DASHBOARD',
  'ACCESS_AI_ANALYTICS', 'MANAGE_USERS', 'EXPORT_DATA', 'ACCEPT_PROPOSALS', 'EXECUTE_TASKS'
]);

const STRATEGIC_FUNCTIONS = new Set(['decisao_estrategica', 'analise', 'governanca']);
const LEADERSHIP_ROLES = new Set(['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor']);

function _hash(parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);
}

function _mkRisk({ type, severity, user_id, area, causes, impact, recommendation, confidence, evidence }) {
  const affected_users = user_id ? [user_id] : [];
  const affected_areas = area ? [area] : [];
  return {
    risk_id: _hash([type, user_id ?? '', area ?? '', JSON.stringify(evidence || {})]),
    type,
    severity,
    affected_users,
    affected_areas,
    probable_causes: causes || [],
    impact,
    recommendation,
    confidence: confidence ?? 0.8,
    evidence: evidence || {},
    detected_at: new Date().toISOString()
  };
}

// 1. excess_privilege
function _detectExcessPrivilege(user, identity) {
  const out = [];
  const caps = new Set(identity.capabilities || []);
  const hl = Number(user.hierarchy_level);
  if (Number.isFinite(hl) && hl >= 4 && caps.has('data:cross_sector')) {
    out.push(_mkRisk({
      type: RISK_TYPES.EXCESS_PRIVILEGE,
      severity: 'high',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['hierarquia >= 4 (não-líder) com data:cross_sector', 'permissão herdada sem revisão'],
      impact: 'Acesso indevido a dados cross-sector; risco LGPD',
      recommendation: 'Remover data:cross_sector ou justificar via política explícita',
      confidence: 0.92,
      evidence: { hierarchy_level: hl, capability: 'data:cross_sector' }
    }));
  }
  if (Number.isFinite(hl) && hl >= 5 && (caps.has('act:approve') || caps.has('act:configure'))) {
    out.push(_mkRisk({
      type: RISK_TYPES.EXCESS_PRIVILEGE,
      severity: 'high',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['hierarquia 5 (colaborador) com act:approve/configure'],
      impact: 'Capacidade de aprovar/configurar sem mandato hierárquico',
      recommendation: 'Reverter capabilities act:* para esta hierarquia',
      confidence: 0.88,
      evidence: { hierarchy_level: hl, act_caps: [...caps].filter((c) => c.startsWith('act:')) }
    }));
  }
  return out;
}

// 2. underprivileged_critical_user
function _detectUnderprivileged(user, identity) {
  const out = [];
  const caps = new Set(identity.capabilities || []);
  if (STRATEGIC_FUNCTIONS.has(identity.function_type) && !caps.has('view:strategic')) {
    out.push(_mkRisk({
      type: RISK_TYPES.UNDERPRIVILEGED_CRITICAL_USER,
      severity: 'high',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['função estratégica sem view:strategic', 'derivação por fallback'],
      impact: 'Decisor estratégico sem KPIs estratégicos',
      recommendation: 'Conceder view:strategic via cargo estrutural ou política',
      confidence: 0.9,
      evidence: { function_type: identity.function_type }
    }));
  }
  if (!caps.has('view:operational')) {
    out.push(_mkRisk({
      type: RISK_TYPES.UNDERPRIVILEGED_CRITICAL_USER,
      severity: 'medium',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['ausência de view:operational base'],
      impact: 'Dashboard ficará vazio ou genérico',
      recommendation: 'Conceder view:operational como base universal',
      confidence: 0.75,
      evidence: {}
    }));
  }
  return out;
}

// 3. ambiguous_identity
function _detectAmbiguousIdentity(user, identity) {
  const out = [];
  const ambSig = [];
  if (identity.sources?.function === 'fallback') ambSig.push('function_fallback');
  if (['fallback', 'context_interpreter'].includes(identity.sources?.area)) ambSig.push('area_inferred');
  if (!user.role || String(user.role).trim().length < 2) ambSig.push('role_missing');
  if (!user.functional_area && !user.department) ambSig.push('area_missing');

  if (ambSig.length >= 2) {
    out.push(_mkRisk({
      type: RISK_TYPES.AMBIGUOUS_IDENTITY,
      severity: ambSig.length >= 3 ? 'high' : 'medium',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ambSig,
      impact: 'Sistema interpreta o utilizador por inferência semântica; entrega genérica',
      recommendation: 'Completar role, functional_area e department canónicos',
      confidence: 0.85,
      evidence: { signals: ambSig, sources: identity.sources }
    }));
  }
  return out;
}

// 4. orphan_permission
function _detectOrphanPermissions(user) {
  const out = [];
  if (!Array.isArray(user.permissions)) return out;
  const orphans = user.permissions.filter((p) => !KNOWN_PERMS.has(String(p)));
  if (orphans.length > 0) {
    out.push(_mkRisk({
      type: RISK_TYPES.ORPHAN_PERMISSION,
      severity: 'low',
      user_id: user.id ?? null,
      area: user.functional_area || null,
      causes: ['permissions sem mapeamento canónico → capabilities'],
      impact: 'Permissões não interpretadas pelo Motor B; podem dar acesso fora da governança',
      recommendation: 'Migrar permissions para o catálogo canónico ou remover',
      confidence: 0.95,
      evidence: { orphan_permissions: orphans }
    }));
  }
  return out;
}

// 5. cross_area_inconsistency
function _detectCrossArea(user, identity) {
  const out = [];
  const declaredArea = (user.functional_area || '').toLowerCase().trim();
  const derivedArea = identity.area;
  if (declaredArea && derivedArea && declaredArea !== derivedArea && declaredArea !== '') {
    out.push(_mkRisk({
      type: RISK_TYPES.CROSS_AREA_INCONSISTENCY,
      severity: 'medium',
      user_id: user.id ?? null,
      area: derivedArea,
      causes: ['functional_area declarado difere da área derivada por interpretação'],
      impact: 'Dashboard pode ficar inconsistente com o cargo declarado',
      recommendation: 'Padronizar functional_area conforme catálogo organizacional',
      confidence: 0.7,
      evidence: { declared: declaredArea, derived: derivedArea }
    }));
  }
  return out;
}

// 6. hierarchy_anomaly
function _detectHierarchyAnomaly(user, identity) {
  const out = [];
  const hl = Number(user.hierarchy_level);
  const role = String(user.role || '').toLowerCase().trim();
  if (Number.isFinite(hl) && LEADERSHIP_ROLES.has(role) && hl >= 5) {
    out.push(_mkRisk({
      type: RISK_TYPES.HIERARCHY_ANOMALY,
      severity: 'high',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['cargo de liderança marcado como colaborador (hl=5)', 'sincronização company_roles → users falhou'],
      impact: 'Filtro hierárquico restringe escopo a individual',
      recommendation: 'Recalcular hierarchy_level a partir do company_roles vinculado',
      confidence: 0.95,
      evidence: { role, hierarchy_level: hl }
    }));
  }
  if (Number.isFinite(hl) && role === 'colaborador' && hl <= 2) {
    out.push(_mkRisk({
      type: RISK_TYPES.HIERARCHY_ANOMALY,
      severity: 'medium',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['role colaborador com hierarchy_level <= 2'],
      impact: 'Acesso a escopo organizacional indevido',
      recommendation: 'Revisar hierarchy_level',
      confidence: 0.85,
      evidence: { role, hierarchy_level: hl }
    }));
  }
  return out;
}

// 7. lgpd_exposure
function _detectLgpd(user, identity) {
  const out = [];
  const caps = new Set(identity.capabilities || []);
  const hl = Number(user.hierarchy_level);
  if (caps.has('view:hr') && caps.has('view:financial') && Number.isFinite(hl) && hl >= 4) {
    out.push(_mkRisk({
      type: RISK_TYPES.LGPD_EXPOSURE,
      severity: 'high',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['união de view:hr + view:financial em hierarquia operacional'],
      impact: 'Exposição cruzada de dados pessoais e financeiros',
      recommendation: 'Restringir uma das capabilities por política',
      confidence: 0.85,
      evidence: { hierarchy_level: hl }
    }));
  }
  if (Array.isArray(user.permissions) && user.permissions.includes('*') && Number.isFinite(hl) && hl >= 3) {
    out.push(_mkRisk({
      type: RISK_TYPES.LGPD_EXPOSURE,
      severity: 'high',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['permissão wildcard `*` fora do nível executivo'],
      impact: 'Acesso total a dados sensíveis sem mandato',
      recommendation: 'Remover wildcard e atribuir capabilities específicas',
      confidence: 0.9,
      evidence: { hierarchy_level: hl }
    }));
  }
  return out;
}

// 8. context_mismatch
function _detectContextMismatch(user, identity) {
  const out = [];
  const role = String(user.role || '').toLowerCase().trim();
  const fn = identity.function_type;
  if (LEADERSHIP_ROLES.has(role) && fn === 'execucao') {
    out.push(_mkRisk({
      type: RISK_TYPES.CONTEXT_MISMATCH,
      severity: 'medium',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['cargo de liderança classificado como função de execução'],
      impact: 'Dashboard mostra widgets operacionais simples a um líder',
      recommendation: 'Revisar functionResolver / cargo estrutural',
      confidence: 0.78,
      evidence: { role, function_type: fn }
    }));
  }
  return out;
}

// 9. role_inflation
function _detectRoleInflation(user, identity) {
  const out = [];
  const caps = new Set(identity.capabilities || []);
  const role = String(user.role || '').toLowerCase().trim();
  // role colaborador com >= 6 capabilities (universo é 14) é inflação
  if (role === 'colaborador' && caps.size >= 7) {
    out.push(_mkRisk({
      type: RISK_TYPES.ROLE_INFLATION,
      severity: 'medium',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['acumulação de capabilities sem cargo correspondente'],
      impact: 'Privilégios sobre o cargo formal',
      recommendation: 'Promover o cargo OU rever capabilities concedidas',
      confidence: 0.7,
      evidence: { role, capability_count: caps.size }
    }));
  }
  return out;
}

// 10. permission_accumulation_over_time (heurístico — usa updated_at quando disponível)
function _detectPermissionAccumulation(user, identity) {
  const out = [];
  const caps = (identity.capabilities || []).length;
  const created = user.created_at ? new Date(user.created_at).getTime() : null;
  const now = Date.now();
  const ageDays = created ? Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24))) : null;
  // se utilizador tem >= 10 capabilities e foi criado há > 365 dias → acumulação histórica
  if (caps >= 10 && ageDays !== null && ageDays > 365) {
    out.push(_mkRisk({
      type: RISK_TYPES.PERMISSION_ACCUMULATION_OVER_TIME,
      severity: 'warn',
      user_id: user.id ?? null,
      area: identity.area,
      causes: ['conta antiga com volume elevado de capabilities'],
      impact: 'Acumulação de privilégios sem revisão periódica',
      recommendation: 'Agendar revisão semestral de capabilities desta conta',
      confidence: 0.6,
      evidence: { age_days: ageDays, capability_count: caps }
    }));
  }
  return out;
}

/**
 * Avalia riscos de UM utilizador.
 */
function detectRisksForUser(user) {
  if (!user) return [];
  const identity = buildContextualIdentity(user);
  const { identity: postPolicies } = applyPolicies({ identity, user });
  return [
    ..._detectExcessPrivilege(user, postPolicies),
    ..._detectUnderprivileged(user, postPolicies),
    ..._detectAmbiguousIdentity(user, postPolicies),
    ..._detectOrphanPermissions(user),
    ..._detectCrossArea(user, postPolicies),
    ..._detectHierarchyAnomaly(user, postPolicies),
    ..._detectLgpd(user, postPolicies),
    ..._detectContextMismatch(user, postPolicies),
    ..._detectRoleInflation(user, postPolicies),
    ..._detectPermissionAccumulation(user, postPolicies)
  ];
}

function _bySeverityRank(s) {
  const i = SEVERITY_ORDER.indexOf(s);
  return i >= 0 ? i : -1;
}

/**
 * Avalia riscos de uma organização inteira; agrega por tipo, área e severidade.
 */
function detectRisksForOrganization(users) {
  const all = [];
  for (const u of users || []) {
    for (const r of detectRisksForUser(u)) all.push(r);
  }
  // Merge de riscos do mesmo tipo+área, expandindo affected_users
  const merged = new Map();
  for (const r of all) {
    const key = `${r.type}|${r.affected_areas.join(',')}|${r.severity}`;
    if (!merged.has(key)) {
      merged.set(key, { ...r, affected_users: [...r.affected_users] });
    } else {
      const m = merged.get(key);
      const set = new Set([...m.affected_users, ...r.affected_users]);
      m.affected_users = [...set];
    }
  }
  const merged_list = Array.from(merged.values()).sort(
    (a, b) => _bySeverityRank(b.severity) - _bySeverityRank(a.severity)
  );

  const by_type = {};
  const by_severity = { critical: 0, high: 0, medium: 0, warn: 0, low: 0 };
  const by_area = {};
  for (const r of merged_list) {
    by_type[r.type] = (by_type[r.type] || 0) + 1;
    if (by_severity[r.severity] !== undefined) by_severity[r.severity] += 1;
    for (const a of r.affected_areas || []) by_area[a] = (by_area[a] || 0) + 1;
  }

  return {
    generated_at: new Date().toISOString(),
    total_risks: merged_list.length,
    risks: merged_list,
    by_type,
    by_severity,
    by_area
  };
}

/**
 * Wrapper para BD.
 */
async function detectRisksFromDatabase(db, opts = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('detectRisksFromDatabase: db inválido');
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
           u.hierarchy_level, u.permissions, u.dashboard_profile, u.created_at
    FROM users u
    ${where}
    ORDER BY u.id ASC
    LIMIT ${limit}
  `;
  const r = await db.query(sql, params);
  return detectRisksForOrganization(r?.rows || []);
}

module.exports = {
  RISK_TYPES,
  detectRisksForUser,
  detectRisksForOrganization,
  detectRisksFromDatabase,
  // exposto para testes determinísticos
  _internals: {
    _detectExcessPrivilege,
    _detectUnderprivileged,
    _detectAmbiguousIdentity,
    _detectOrphanPermissions,
    _detectCrossArea,
    _detectHierarchyAnomaly,
    _detectLgpd,
    _detectContextMismatch,
    _detectRoleInflation,
    _detectPermissionAccumulation,
    KNOWN_PERMS,
    ALL_CAPABILITIES,
    IMPLICIT_BY_FUNCTION_AREA
  }
};
