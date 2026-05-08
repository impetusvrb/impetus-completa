'use strict';

/**
 * CONTEXT_IDENTITY_AUDIT — auditoria do cadastro de utilizadores em
 * relação à identidade contextual derivada.
 *
 * Cruza dados de cadastro (`role`, `job_title`, `functional_area`,
 * `department`, `permissions`, `hierarchy_level`) com o resultado do
 * `identityResolver` + políticas, e produz um relatório com:
 *
 *   - users_misclassified   : função inferida via fallback (role indefinido)
 *   - users_no_area         : sem área válida resolvida
 *   - users_capabilities_inconsistent : capabilities < esperadas pela política
 *   - users_excess_access   : data:cross_sector ou act:* em hierarquia ≥4
 *   - users_underprivileged : sem view:operational básico (qualquer função)
 *
 * Esta camada é READ-ONLY. Aceita qualquer iterable de utilizadores
 * (do BD, de um snapshot, de testes). O orquestrador é responsável
 * por buscar utilizadores e passá-los aqui.
 */

const { buildContextualIdentity } = require('../identity/identityResolver');
const { applyPolicies } = require('../policies/dashboardPolicyEngine');

function _isPlausibleArea(area, source) {
  if (!area) return false;
  // áreas derivadas via fallback/inferência semântica (ex.: keywords do
  // profileContextInterpreter) são consideradas não-confiáveis para fins
  // de auditoria.
  const UNRELIABLE_SOURCES = new Set(['fallback', 'inferred', 'default', 'context_interpreter']);
  if (UNRELIABLE_SOURCES.has(source)) return false;
  return true;
}

function _isCriticalFunction(fn) {
  return fn === 'decisao_estrategica' || fn === 'analise' || fn === 'governanca';
}

/**
 * Audita um único utilizador. Devolve um array de findings (vazio = OK).
 */
function auditUser(user) {
  const findings = [];
  if (!user) return findings;

  const identity = buildContextualIdentity(user);
  const { identity: identityWithPolicies } = applyPolicies({ identity, user });

  if (identity.sources?.function === 'fallback') {
    findings.push({
      severity: 'warn',
      kind: 'misclassified',
      detail: 'function_type derivado por fallback (role ausente ou desconhecido)',
      user_id: user.id ?? null,
      role: user.role || null,
      job_title: user.job_title || null
    });
  }

  const areaSource = identity.sources?.area || null;
  if (!_isPlausibleArea(identity.area, areaSource)) {
    findings.push({
      severity: 'high',
      kind: 'no_area',
      detail: areaSource
        ? `área resolvida via ${areaSource} (não-confiável) — recomendar cadastro explícito`
        : 'área funcional não resolvida — utilizador receberá fallback genérico',
      user_id: user.id ?? null,
      functional_area: user.functional_area || null,
      department: user.department || null,
      area_source: areaSource
    });
  }

  // Capability deficit para função crítica
  const requiredCriticalCaps = {
    decisao_estrategica: ['view:strategic'],
    analise: ['view:operational'],
    governanca: ['view:audit']
  };
  const reqCaps = requiredCriticalCaps[identity.function_type] || [];
  const caps = new Set(identityWithPolicies.capabilities || []);
  const missing = reqCaps.filter((c) => !caps.has(c));
  if (missing.length > 0 && _isCriticalFunction(identity.function_type)) {
    findings.push({
      severity: 'high',
      kind: 'capabilities_inconsistent',
      detail: `função ${identity.function_type} sem capabilities mínimas`,
      user_id: user.id ?? null,
      missing_capabilities: missing
    });
  }

  // Capability básica ausente
  if (!caps.has('view:operational')) {
    findings.push({
      severity: 'medium',
      kind: 'underprivileged',
      detail: 'sem capability view:operational — dashboard ficará vazio',
      user_id: user.id ?? null
    });
  }

  // Excesso de acesso por baixo nível hierárquico
  const hl = Number(user.hierarchy_level);
  if (Number.isFinite(hl) && hl >= 4 && caps.has('data:cross_sector')) {
    findings.push({
      severity: 'high',
      kind: 'excess_access',
      detail: `nível hierárquico ${hl} possui data:cross_sector — risco LGPD`,
      user_id: user.id ?? null
    });
  }

  // Permissions desconhecidas (não mapeadas para capabilities)
  const KNOWN_PERMS = new Set([
    '*', 'VIEW_STRATEGIC', 'VIEW_FINANCIAL', 'VIEW_OPERATIONAL', 'VIEW_AUDIT_LOGS',
    'VIEW_SAFETY', 'VIEW_QUALITY', 'VIEW_HR', 'VIEW_DOCUMENTS', 'VIEW_DASHBOARD',
    'ACCESS_AI_ANALYTICS', 'MANAGE_USERS', 'EXPORT_DATA', 'ACCEPT_PROPOSALS', 'EXECUTE_TASKS'
  ]);
  if (Array.isArray(user.permissions)) {
    const unknown = user.permissions.filter((p) => !KNOWN_PERMS.has(String(p)));
    if (unknown.length > 0) {
      findings.push({
        severity: 'low',
        kind: 'unknown_permissions',
        detail: 'permissions sem mapeamento canónico para capabilities',
        user_id: user.id ?? null,
        unknown_permissions: unknown
      });
    }
  }

  return findings;
}

/**
 * Auditar lote de utilizadores.
 * @param {Iterable<object>} users
 * @returns {{ generated_at, total_users, total_findings, findings, by_kind, by_severity }}
 */
function auditUsers(users) {
  const all = [];
  let total = 0;
  for (const u of users || []) {
    total += 1;
    const fs = auditUser(u);
    for (const f of fs) all.push(f);
  }
  const byKind = {};
  const bySeverity = { high: 0, medium: 0, warn: 0, low: 0 };
  for (const f of all) {
    byKind[f.kind] = (byKind[f.kind] || 0) + 1;
    if (bySeverity[f.severity] !== undefined) bySeverity[f.severity] += 1;
  }
  return {
    generated_at: new Date().toISOString(),
    total_users: total,
    total_findings: all.length,
    findings: all,
    by_kind: byKind,
    by_severity: bySeverity
  };
}

/**
 * Auditoria orientada a base de dados — procura utilizadores em tabelas
 * comuns. NÃO requer migrations novas. O caller fornece um adaptador `db`
 * compatível com `pg` (`db.query(text, params)`).
 *
 * @param {{ query: Function }} db
 * @param {{ limit?: number, company_id?: string }} [opts]
 */
async function auditFromDatabase(db, opts = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('auditFromDatabase: parâmetro `db` inválido (esperado pg.Pool ou compat.)');
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
  const users = r?.rows || [];
  return auditUsers(users);
}

module.exports = {
  auditUser,
  auditUsers,
  auditFromDatabase
};
