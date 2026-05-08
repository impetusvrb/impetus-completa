'use strict';

/**
 * ContextRecommendationEngine
 *
 * Camada de recomendações organizacionais NÃO-AUTOMÁTICAS.
 * Regra absoluta: o sistema NUNCA aplica mudanças sozinho. Apenas sugere.
 *
 * Saída canónica de cada recomendação:
 *   {
 *     id, type, severity, target: { user_id, area, department },
 *     suggestion, rationale, evidence, reversible, destructive,
 *     status: 'open' | 'acknowledged' | 'rejected',
 *     created_at, requires_human_action: true
 *   }
 *
 * Tipos de recomendação:
 *   - capability_grant     (sugere conceder capability faltante)
 *   - capability_revoke    (sugere revogar capability excedente)
 *   - role_review          (sugere rever cargo / função)
 *   - area_normalization   (sugere padronizar functional_area)
 *   - hierarchy_realign    (sugere recalcular hierarchy_level)
 *   - permission_migrate   (sugere migrar permissions órfãs)
 *   - lgpd_segregation     (sugere segregar acesso por LGPD)
 *
 * Princípios:
 *   - auditável (id estável + evidence)
 *   - explicável (rationale humano + evidence técnico)
 *   - reversível (sempre)
 *   - não destrutiva (nunca apaga dados)
 */

const crypto = require('crypto');
const { detectRisksForUser } = require('./contextRiskEngine');
const { scoreUser } = require('./integrityScoreService');
const { buildContextualIdentity } = require('../identity/identityResolver');
const { applyPolicies } = require('../policies/dashboardPolicyEngine');

const REC_TYPES = Object.freeze({
  CAPABILITY_GRANT: 'capability_grant',
  CAPABILITY_REVOKE: 'capability_revoke',
  ROLE_REVIEW: 'role_review',
  AREA_NORMALIZATION: 'area_normalization',
  HIERARCHY_REALIGN: 'hierarchy_realign',
  PERMISSION_MIGRATE: 'permission_migrate',
  LGPD_SEGREGATION: 'lgpd_segregation'
});

function _id(...parts) {
  return crypto.createHash('sha1').update(parts.map((p) => String(p ?? '')).join('|')).digest('hex').slice(0, 12);
}

function _mk({ type, severity, target, suggestion, rationale, evidence, reversible = true, destructive = false }) {
  return {
    id: _id(type, target.user_id ?? '', target.area ?? '', JSON.stringify(evidence || {})),
    type,
    severity,
    target,
    suggestion,
    rationale,
    evidence: evidence || {},
    reversible,
    destructive,
    status: 'open',
    requires_human_action: true,
    created_at: new Date().toISOString()
  };
}

/**
 * Recomendações para UM utilizador.
 * Combina sinais de risk engine + score + audit.
 */
function recommendForUser(user) {
  if (!user) return [];
  const out = [];
  const identity = buildContextualIdentity(user);
  const { identity: postPolicies } = applyPolicies({ identity, user });
  const score = scoreUser(user);
  const risks = detectRisksForUser(user);

  const target = {
    user_id: user.id ?? null,
    area: postPolicies.area || null,
    department: user.department || null
  };

  // Risco 1 — excess privilege → revoke
  for (const r of risks.filter((x) => x.type === 'excess_privilege')) {
    const cap = r.evidence?.capability;
    out.push(_mk({
      type: REC_TYPES.CAPABILITY_REVOKE,
      severity: r.severity,
      target,
      suggestion: cap ? `Avaliar revogação da capability \`${cap}\`` : 'Avaliar revogação de capabilities act:* sensíveis',
      rationale: 'Capability concedida acima do mandato hierárquico do utilizador.',
      evidence: r.evidence
    }));
  }

  // Risco 2 — underprivileged → grant
  for (const r of risks.filter((x) => x.type === 'underprivileged_critical_user')) {
    if (r.recommendation && /view:strategic/.test(r.recommendation)) {
      out.push(_mk({
        type: REC_TYPES.CAPABILITY_GRANT,
        severity: r.severity,
        target,
        suggestion: 'Conceder `view:strategic` (cargo estrutural ou política)',
        rationale: 'Função estratégica detectada sem KPIs estratégicos.',
        evidence: r.evidence
      }));
    } else {
      out.push(_mk({
        type: REC_TYPES.CAPABILITY_GRANT,
        severity: r.severity,
        target,
        suggestion: 'Conceder capability base `view:operational`',
        rationale: 'Sem capability base, dashboard fica vazio.',
        evidence: r.evidence
      }));
    }
  }

  // Risco 3 — ambiguous_identity → role review + area normalization
  for (const r of risks.filter((x) => x.type === 'ambiguous_identity')) {
    out.push(_mk({
      type: REC_TYPES.ROLE_REVIEW,
      severity: r.severity,
      target,
      suggestion: 'Rever cargo ambíguo — preencher role + functional_area canónicos',
      rationale: 'Identidade contextual derivada por inferência semântica.',
      evidence: r.evidence
    }));
  }

  // Risco 4 — orphan permissions → migrate
  for (const r of risks.filter((x) => x.type === 'orphan_permission')) {
    out.push(_mk({
      type: REC_TYPES.PERMISSION_MIGRATE,
      severity: r.severity,
      target,
      suggestion: 'Mapear permissions órfãs para o catálogo canónico',
      rationale: 'Permissions que não têm correspondência em capabilities ficam fora da governança.',
      evidence: r.evidence
    }));
  }

  // Risco 5 — cross_area_inconsistency
  for (const r of risks.filter((x) => x.type === 'cross_area_inconsistency')) {
    out.push(_mk({
      type: REC_TYPES.AREA_NORMALIZATION,
      severity: r.severity,
      target,
      suggestion: `Normalizar área para "${r.evidence.derived || 'área canónica'}"`,
      rationale: 'functional_area declarada difere da área derivada da função.',
      evidence: r.evidence
    }));
  }

  // Risco 6 — hierarchy_anomaly
  for (const r of risks.filter((x) => x.type === 'hierarchy_anomaly')) {
    out.push(_mk({
      type: REC_TYPES.HIERARCHY_REALIGN,
      severity: r.severity,
      target,
      suggestion: 'Recalcular hierarchy_level a partir do company_role vinculado',
      rationale: 'Inconsistência entre cargo estrutural e nível hierárquico individual.',
      evidence: r.evidence
    }));
  }

  // Risco 7 — lgpd_exposure
  for (const r of risks.filter((x) => x.type === 'lgpd_exposure')) {
    out.push(_mk({
      type: REC_TYPES.LGPD_SEGREGATION,
      severity: r.severity,
      target,
      suggestion: 'Segregar capabilities sensíveis (HR/financial/wildcard) por política',
      rationale: 'Conjunto atual cria exposição LGPD.',
      evidence: r.evidence
    }));
  }

  // Risco 8 — context_mismatch
  for (const r of risks.filter((x) => x.type === 'context_mismatch')) {
    out.push(_mk({
      type: REC_TYPES.ROLE_REVIEW,
      severity: r.severity,
      target,
      suggestion: 'Rever functionResolver / função associada ao cargo',
      rationale: 'Cargo de liderança classificado como execução pelo functionResolver.',
      evidence: r.evidence
    }));
  }

  // Score baixo sem risco directo → recomendação de revisão de cadastro
  if (score && score.identity_quality < 60 && !out.some((r) => r.type === REC_TYPES.ROLE_REVIEW)) {
    out.push(_mk({
      type: REC_TYPES.ROLE_REVIEW,
      severity: 'medium',
      target,
      suggestion: 'Completar dados básicos do cadastro (role, job_title, functional_area, hierarchy_level)',
      rationale: 'Qualidade de identidade abaixo de 60.',
      evidence: { identity_quality: score.identity_quality }
    }));
  }

  // Deduplicar por id
  const seen = new Set();
  const unique = [];
  for (const r of out) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }
  return unique;
}

/**
 * Recomendações para a organização (lote).
 */
function recommendForOrganization(users) {
  const all = [];
  for (const u of users || []) {
    for (const r of recommendForUser(u)) all.push(r);
  }
  const by_type = {};
  const by_severity = { critical: 0, high: 0, medium: 0, warn: 0, low: 0 };
  for (const r of all) {
    by_type[r.type] = (by_type[r.type] || 0) + 1;
    if (by_severity[r.severity] !== undefined) by_severity[r.severity] += 1;
  }
  return {
    generated_at: new Date().toISOString(),
    total: all.length,
    recommendations: all,
    by_type,
    by_severity
  };
}

async function recommendFromDatabase(db, opts = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('recommendFromDatabase: db inválido');
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
  return recommendForOrganization(r?.rows || []);
}

module.exports = {
  REC_TYPES,
  recommendForUser,
  recommendForOrganization,
  recommendFromDatabase
};
