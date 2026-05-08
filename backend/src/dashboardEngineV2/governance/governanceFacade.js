'use strict';

/**
 * GovernanceFacade
 *
 * Ponto único de orquestração da camada de Governança Contextual.
 * NÃO tem lógica nova — apenas:
 *   - encadeia chamadas dos services (score → risks → recommendations → analyzer)
 *   - emite eventos para o ContextHistoryStore
 *   - notifica os learningHooks para preparação ML futura
 *
 * Esta façade é READ-ONLY. Não modifica permissões nem cadastros.
 */

const score = require('./integrityScoreService');
const risks = require('./contextRiskEngine');
const recos = require('./recommendationEngine');
const caps = require('./capabilityConsistencyAnalyzer');
const history = require('./contextHistoryStore');
const learning = require('../learning/learningHooks');

function _emitToHistory({ scope, scoreSnapshot, riskSnapshot, recoSnapshot }) {
  const opts = { scope, source: 'governance_facade' };
  if (scoreSnapshot) {
    history.recordIntegrityScoreChange({
      scope,
      before: null,
      after: scoreSnapshot.overall_score
    }, opts);
    learning.notifyIntegrityScore({ score: scoreSnapshot, scope });
  }
  if (riskSnapshot) {
    for (const r of riskSnapshot.risks || []) {
      history.recordRiskEmitted({
        risk_type: r.type,
        severity: r.severity,
        user_id: r.affected_users?.[0],
        area: r.affected_areas?.[0]
      }, opts);
      learning.notifyRiskDetected({ risk: r });
    }
  }
  if (recoSnapshot) {
    for (const rec of recoSnapshot.recommendations || []) {
      history.recordRecommendationEmitted({
        type: rec.type,
        severity: rec.severity,
        target: rec.target
      }, opts);
      learning.notifyRecommendationEmitted({ recommendation: rec });
    }
  }
}

/**
 * Snapshot completo da governança a partir de utilizadores em memória.
 *
 * @param {Iterable<object>} users
 * @param {object} [opts]
 * @param {boolean} [opts.includeUsersBreakdown=false]
 * @param {string}  [opts.scope]                   ex.: 'company:42'
 * @returns {object}
 */
function snapshotFromUsers(users, opts = {}) {
  const list = Array.from(users || []);
  const scoreSnapshot = score.scoreOrganization(list);
  const riskSnapshot = risks.detectRisksForOrganization(list);
  const recoSnapshot = recos.recommendForOrganization(list);
  const capsSnapshot = caps.analyzeFromUsers(list);

  const scope = opts.scope || 'global';
  _emitToHistory({ scope, scoreSnapshot, riskSnapshot, recoSnapshot });

  // Linha temporal dos últimos eventos para este scope
  const recentEvents = history.getRecent({ scope }, 50);

  const summary = {
    overall_score: scoreSnapshot.overall_score,
    risk_level: scoreSnapshot.risk_level,
    total_users: scoreSnapshot.total_users,
    high_risk_users: scoreSnapshot.summary.high_risk_users,
    active_risks: riskSnapshot.total_risks,
    open_recommendations: recoSnapshot.total,
    capability_issues: capsSnapshot.issues.length,
    conflicting_policies: capsSnapshot.conflicting_policies.length,
    health_label: scoreSnapshot.overall_score >= 85
      ? 'healthy'
      : scoreSnapshot.overall_score >= 70
        ? 'attention'
        : scoreSnapshot.overall_score >= 50
          ? 'degraded'
          : 'critical'
  };

  const out = {
    generated_at: new Date().toISOString(),
    scope,
    summary,
    integrity: {
      overall_score: scoreSnapshot.overall_score,
      contextual_integrity: scoreSnapshot.contextual_integrity,
      security_integrity: scoreSnapshot.security_integrity,
      hierarchy_integrity: scoreSnapshot.hierarchy_integrity,
      identity_quality: scoreSnapshot.identity_quality,
      lgpd_alignment: scoreSnapshot.lgpd_alignment,
      risk_level: scoreSnapshot.risk_level,
      confidence: scoreSnapshot.confidence,
      by_area: scoreSnapshot.by_area,
      by_department: scoreSnapshot.by_department
    },
    risks: {
      total: riskSnapshot.total_risks,
      by_type: riskSnapshot.by_type,
      by_severity: riskSnapshot.by_severity,
      by_area: riskSnapshot.by_area,
      top: riskSnapshot.risks.slice(0, 25)
    },
    recommendations: {
      total: recoSnapshot.total,
      by_type: recoSnapshot.by_type,
      by_severity: recoSnapshot.by_severity,
      top: recoSnapshot.recommendations.slice(0, 25)
    },
    capabilities: {
      total_issues: capsSnapshot.issues.length,
      issues: capsSnapshot.issues,
      conflicting_policies: capsSnapshot.conflicting_policies,
      coverage_by_function: capsSnapshot.coverage_by_function,
      capability_map: capsSnapshot.capability_map,
      redundant_pairs: capsSnapshot.redundant_pairs
    },
    history: {
      recent_events: recentEvents,
      total_in_buffer: history.size()
    }
  };

  if (opts.includeUsersBreakdown) {
    out.integrity.by_user = scoreSnapshot.by_user;
  }

  return out;
}

/**
 * Snapshot a partir do BD.
 */
async function snapshotFromDatabase(db, opts = {}) {
  if (!db || typeof db.query !== 'function') {
    throw new Error('snapshotFromDatabase: db inválido');
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
           u.hierarchy_level, u.permissions, u.dashboard_profile, u.created_at,
           d.name AS department_resolved_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
    ${where}
    ORDER BY u.id ASC
    LIMIT ${limit}
  `;
  const r = await db.query(sql, params);
  return snapshotFromUsers(r?.rows || [], { ...opts, scope: opts.company_id ? `company:${opts.company_id}` : 'global' });
}

module.exports = {
  snapshotFromUsers,
  snapshotFromDatabase,
  // re-export para conveniência
  score,
  risks,
  recos,
  caps,
  history,
  learning
};
