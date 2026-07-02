/**
 * CERT-PULSE-02 — Facade do Pulse Cognitivo Organizacional (API + dashboard).
 */
'use strict';

const db = require('../../db');
const perceptionLayer = require('./perceptionLayer');
const { correlateHumanSignals } = require('./humanCorrelationEngine');
const { computePulseIndex, DIMENSIONS } = require('./indexCalculator');
const { buildOrganizationalUnderstanding } = require('./cognitiveMotor');
const { inferOrganizationalState } = require('./stateEngine');
const { generateOrganizationalComprehension } = require('./organizationalAI');
const eventIngestion = require('./eventIngestion');
const { recomputeAggregates, loadMemberIndices } = require('./aggregateIndexService');
const { GOVERNANCE, ORGANIZATIONAL_STATES, EVENT_TYPES } = require('./constants');
const hooks = require('./hooks');
const pulseObs = require('./pulseCognitiveObservability');
const { buildExecutiveDashboard } = require('./executiveDashboard');
const { buildCognitiveTimeline } = require('./timelineService');
const { analyzeTemporalLearning } = require('./temporalLearning');
const { analyzeCrossDomain } = require('./crossDomainCorrelation');
const { buildExplainability } = require('./explainability');

function parseJson(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return v;
  }
}

async function tablesReady() {
  try {
    await db.query(`SELECT 1 FROM pulse_cognitive_index LIMIT 1`);
    return true;
  } catch (_) {
    return false;
  }
}

async function getDashboard(companyId, opts = {}) {
  const started = Date.now();
  const ready = await tablesReady();
  if (!ready) {
    pulseObs.recordDashboardLatency(Date.now() - started);
    return {
      ok: true,
      migration_required: true,
      governance: GOVERNANCE,
      message: 'Execute backend/src/models/pulse_cognitive_migration.sql para ativar o Pulse Cognitivo.'
    };
  }

  const [companyAgg, states, patterns, insights, history, members] = await Promise.all([
    loadAggregate(companyId, 'company', 'all'),
    loadStates(companyId),
    loadRecentPatterns(companyId, 20),
    loadRecentInsights(companyId, 15),
    loadIndexHistory(companyId, opts.days || 90),
    loadMemberIndices(companyId)
  ]);

  const byScope = await loadAllAggregates(companyId);

  const result = {
    ok: true,
    governance: GOVERNANCE,
    framework: 'pulse_cognitive_organizational',
    symmetry: 'digital_twin_human_operations',
    company_pulse: companyAgg,
    organizational_states: states,
    aggregates: byScope,
    patterns,
    insights,
    temporal: history,
    member_count: members.length,
    dimensions_schema: DIMENSIONS.map((d) => ({ key: d.key, label: d.label, weight: d.weight })),
    state_catalog: ORGANIZATIONAL_STATES,
    monitored_events: EVENT_TYPES,
    legacy_pulse_compatible: true
  };
  pulseObs.recordDashboardLatency(Date.now() - started);
  return result;
}

async function loadAggregate(companyId, scopeType, scopeKey) {
  try {
    const r = await db.query(
      `SELECT * FROM pulse_cognitive_aggregate_index WHERE company_id = $1 AND scope_type = $2 AND scope_key = $3`,
      [companyId, scopeType, scopeKey]
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      ...row,
      dimensions: parseJson(row.dimensions),
      patterns: parseJson(row.patterns)
    };
  } catch (_) {
    return null;
  }
}

async function loadAllAggregates(companyId) {
  try {
    const r = await db.query(
      `SELECT * FROM pulse_cognitive_aggregate_index WHERE company_id = $1 ORDER BY scope_type, scope_label`,
      [companyId]
    );
    return (r.rows || []).map((row) => ({
      ...row,
      dimensions: parseJson(row.dimensions),
      patterns: parseJson(row.patterns)
    }));
  } catch (_) {
    return [];
  }
}

async function loadStates(companyId) {
  try {
    const r = await db.query(
      `SELECT * FROM pulse_cognitive_state WHERE company_id = $1 ORDER BY scope_type, scope_label`,
      [companyId]
    );
    return (r.rows || []).map((row) => ({
      ...row,
      inference: parseJson(row.inference),
      evidence: parseJson(row.evidence)
    }));
  } catch (_) {
    return [];
  }
}

async function loadRecentPatterns(companyId, limit = 20) {
  try {
    const r = await db.query(
      `
      SELECT * FROM pulse_cognitive_patterns
      WHERE company_id = $1 AND (expires_at IS NULL OR expires_at > now())
      ORDER BY detected_at DESC LIMIT $2
    `,
      [companyId, limit]
    );
    return (r.rows || []).map((row) => ({
      ...row,
      signals: parseJson(row.signals),
      correlations: parseJson(row.correlations)
    }));
  } catch (_) {
    return [];
  }
}

async function loadRecentInsights(companyId, limit = 15) {
  try {
    const r = await db.query(
      `SELECT * FROM pulse_cognitive_insights WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [companyId, limit]
    );
    return (r.rows || []).map((row) => ({
      ...row,
      indicators_used: parseJson(row.indicators_used),
      correlations: parseJson(row.correlations),
      evidence: parseJson(row.evidence)
    }));
  } catch (_) {
    return [];
  }
}

async function loadIndexHistory(companyId, days = 90) {
  try {
    const r = await db.query(
      `
      SELECT date_trunc('day', recorded_at) AS day,
        AVG(pulse_index)::numeric(5,2) AS avg_index,
        COUNT(*)::int AS samples
      FROM pulse_cognitive_index_history
      WHERE company_id = $1 AND recorded_at >= now() - ($2::int || ' days')::interval
      GROUP BY 1 ORDER BY 1
    `,
      [companyId, days]
    );
    return r.rows || [];
  } catch (_) {
    return [];
  }
}

async function getSubjectIndex(companyId, userId, teamMemberId) {
  const ready = await tablesReady();
  if (!ready) return { ok: false, migration_required: true };

  let r;
  if (userId) {
    r = await db.query(`SELECT * FROM pulse_cognitive_index WHERE company_id = $1 AND user_id = $2`, [
      companyId,
      userId
    ]);
  } else if (teamMemberId) {
    r = await db.query(
      `SELECT * FROM pulse_cognitive_index WHERE company_id = $1 AND operational_team_member_id = $2`,
      [companyId, teamMemberId]
    );
  } else {
    return { ok: false, error: 'subject_required' };
  }

  const row = r.rows[0];
  if (!row) {
    const computed = await eventIngestion.processSubject(companyId, { userId, teamMemberId });
    if (!computed.ok) return { ok: true, index: null, computed };
    return getSubjectIndex(companyId, userId, teamMemberId);
  }

  return {
    ok: true,
    index: {
      ...row,
      dimensions: parseJson(row.dimensions),
      signals_snapshot: parseJson(row.signals_snapshot),
      correlations: parseJson(row.correlations)
    },
    governance: GOVERNANCE
  };
}

async function generateComprehension(companyId, userId, billing, scope = {}) {
  const perception = await perceptionLayer.buildOrganizationalPerception(companyId, {
    userId: scope.user_id,
    teamMemberId: scope.operational_team_member_id
  });
  if (!perception.ok) return perception;

  const correlationPack = correlateHumanSignals(perception);
  const indexPack = computePulseIndex(perception, correlationPack);
  const understanding = buildOrganizationalUnderstanding(perception, indexPack, correlationPack);

  const aiReading = await generateOrganizationalComprehension(
    companyId,
    userId,
    {
      perception_summary: {
        profile: perception.profile,
        operational: perception.operational,
        human_signals: perception.human_signals
      },
      understanding: understanding.understanding
    },
    billing
  );

  return {
    ok: true,
    understanding: understanding.understanding,
    comprehension: aiReading,
    governance: GOVERNANCE
  };
}

async function triggerReconciliation(companyId) {
  return eventIngestion.reconcileCompany(companyId);
}

async function getExecutiveDashboard(companyId, opts = {}) {
  const base = await getDashboard(companyId, opts);
  if (base.migration_required) return base;
  return buildExecutiveDashboard(companyId, base);
}

async function getTimeline(companyId, opts = {}) {
  return buildCognitiveTimeline(companyId, opts);
}

async function getTemporalLearning(companyId, scope = {}) {
  return analyzeTemporalLearning(companyId, scope);
}

async function getCrossDomainInsights(companyId) {
  return analyzeCrossDomain(companyId);
}

async function getExplainabilityForSubject(companyId, userId, teamMemberId) {
  const perception = await perceptionLayer.buildOrganizationalPerception(companyId, {
    userId,
    teamMemberId
  });
  if (!perception.ok) return perception;

  const correlationPack = correlateHumanSignals(perception);
  const indexPack = computePulseIndex(perception, correlationPack);
  const temporalPack = await analyzeTemporalLearning(companyId, { userId, teamMemberId });

  return {
    ok: true,
    explainability: buildExplainability(indexPack, perception, correlationPack, temporalPack),
    pulse_index: indexPack.pulse_index,
    governance: GOVERNANCE
  };
}

function getSchedulerStatus() {
  return {
    ok: true,
    scheduler_enabled: process.env.IMPETUS_PULSE_SCHEDULER !== 'off',
    cognitive_hooks_enabled: process.env.IMPETUS_PULSE_COGNITIVE !== 'off',
    interval_ms_default: 300000,
    governance: GOVERNANCE
  };
}

module.exports = {
  getDashboard,
  getExecutiveDashboard,
  getTimeline,
  getTemporalLearning,
  getCrossDomainInsights,
  getExplainabilityForSubject,
  getSchedulerStatus,
  getSubjectIndex,
  generateComprehension,
  triggerReconciliation,
  ingestHumanEvent: eventIngestion.ingestHumanEvent,
  hooks,
  tablesReady,
  GOVERNANCE
};
