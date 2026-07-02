/**
 * CERT-PULSE-02 FASE 7/11 — Ingestão silenciosa de eventos humanos.
 */
'use strict';

const db = require('../../db');
const perceptionLayer = require('./perceptionLayer');
const { correlateHumanSignals } = require('./humanCorrelationEngine');
const { computePulseIndex } = require('./indexCalculator');
const { buildOrganizationalUnderstanding } = require('./cognitiveMotor');
const { recomputeAggregates } = require('./aggregateIndexService');
const pulseObs = require('./pulseCognitiveObservability');
const pulseAudit = require('./pulseCognitiveAudit');
const { buildExplainability } = require('./explainability');
const { analyzeTemporalLearning } = require('./temporalLearning');

const processing = new Map();
const DEBOUNCE_MS = 2500;

async function recordEvent(companyId, event) {
  if (!companyId || !event?.event_type) return null;
  try {
    const r = await db.query(
      `
      INSERT INTO pulse_cognitive_events (
        company_id, user_id, operational_team_member_id, event_type, event_source, payload
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [
        companyId,
        event.user_id || null,
        event.operational_team_member_id || null,
        event.event_type,
        event.event_source || 'platform',
        JSON.stringify(event.payload || {})
      ]
    );
    return r.rows[0]?.id || null;
  } catch (err) {
    console.warn('[pulseCognitive][recordEvent]', err?.message || err);
    return null;
  }
}

async function loadPreviousDimensions(companyId, userId, teamMemberId) {
  try {
    let r;
    if (userId) {
      r = await db.query(
        `SELECT dimensions FROM pulse_cognitive_index WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId]
      );
    } else if (teamMemberId) {
      r = await db.query(
        `SELECT dimensions FROM pulse_cognitive_index WHERE company_id = $1 AND operational_team_member_id = $2`,
        [companyId, teamMemberId]
      );
    } else {
      return null;
    }
    const row = r.rows[0];
    if (!row) return null;
    return typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions;
  } catch (_) {
    return null;
  }
}

async function persistSubjectIndex(companyId, subject, indexPack, perception, correlationPack) {
  const { userId, teamMemberId } = subject;
  const state = correlationPack.patterns?.length
    ? require('./stateEngine').inferOrganizationalState(indexPack, correlationPack)
    : require('./stateEngine').inferOrganizationalState(indexPack, {});

  const params = [
    companyId,
    userId || null,
    teamMemberId || null,
    indexPack.pulse_index,
    JSON.stringify(indexPack.dimensions),
    JSON.stringify(perception),
    JSON.stringify(correlationPack.correlations || []),
    state.state_code,
    indexPack.confidence
  ];

  const payload = {
    pulse_index: params[3],
    dimensions: params[4],
    signals_snapshot: params[5],
    correlations: params[6],
    organizational_state: params[7],
    confidence: params[8]
  };

  let existing;
  if (userId) {
    existing = await db.query(
      `SELECT id FROM pulse_cognitive_index WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId]
    );
  } else {
    existing = await db.query(
      `SELECT id FROM pulse_cognitive_index WHERE company_id = $1 AND operational_team_member_id = $2`,
      [companyId, teamMemberId]
    );
  }

  if (existing?.rows?.length) {
    await db.query(
      `
      UPDATE pulse_cognitive_index SET
        pulse_index = $1, dimensions = $2, signals_snapshot = $3, correlations = $4,
        organizational_state = $5, confidence = $6, computed_at = now(), updated_at = now()
      WHERE id = $7
    `,
      [
        payload.pulse_index,
        payload.dimensions,
        payload.signals_snapshot,
        payload.correlations,
        payload.organizational_state,
        payload.confidence,
        existing.rows[0].id
      ]
    );
  } else if (userId) {
    await db.query(
      `
      INSERT INTO pulse_cognitive_index (
        company_id, user_id, pulse_index, dimensions, signals_snapshot, correlations,
        organizational_state, confidence, computed_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
    `,
      params
    );
  } else if (teamMemberId) {
    await db.query(
      `
      INSERT INTO pulse_cognitive_index (
        company_id, operational_team_member_id, pulse_index, dimensions, signals_snapshot,
        correlations, organizational_state, confidence, computed_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
    `,
      params
    );
  }

  await db.query(
    `
    INSERT INTO pulse_cognitive_index_history (
      company_id, user_id, operational_team_member_id, pulse_index, dimensions,
      organizational_state, confidence, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
  `,
    [
      companyId,
      userId || null,
      teamMemberId || null,
      indexPack.pulse_index,
      JSON.stringify(indexPack.dimensions),
      state.state_code,
      indexPack.confidence
    ]
  );

  for (const pattern of correlationPack.patterns || []) {
    await db.query(
      `
      INSERT INTO pulse_cognitive_patterns (
        company_id, scope_type, scope_key, pattern_code, pattern_label, severity,
        signals, correlations, confidence, assistive_only, detected_at, expires_at
      ) VALUES ($1, 'individual', $2, $3, $4, $5, $6, $7, $8, true, now(), now() + interval '30 days')
    `,
      [
        companyId,
        userId || teamMemberId,
        pattern.code,
        pattern.label,
        pattern.severity || 'info',
        JSON.stringify(pattern.signals || []),
        JSON.stringify(correlationPack.correlations || []),
        pattern.confidence || 0.5
      ]
    );
  }

  const understanding = buildOrganizationalUnderstanding(perception, indexPack, correlationPack);
  for (const ins of understanding.insights || []) {
    await db.query(
      `
      INSERT INTO pulse_cognitive_insights (
        company_id, scope_type, scope_key, insight_type, title, summary,
        indicators_used, correlations, evidence, confidence, assistive_only, human_in_the_loop, ai_generated
      ) VALUES ($1, 'individual', $2, $3, $4, $5, $6, $7, $8, $9, true, true, false)
    `,
      [
        companyId,
        userId || teamMemberId,
        ins.insight_type,
        ins.title,
        ins.summary,
        JSON.stringify(ins.indicators_used || []),
        JSON.stringify(ins.correlations || []),
        JSON.stringify(ins.evidence || []),
        ins.confidence || 0.5
      ]
    );
  }
}

/**
 * Recalcula índice de um colaborador (silencioso).
 */
async function processSubject(companyId, subject = {}) {
  const { userId, teamMemberId, collectiveUserId } = subject;
  if (!userId && !teamMemberId) return { ok: false, reason: 'missing_subject' };

  const traceId = pulseAudit.newTraceId();
  const t0 = Date.now();

  try {
    const perception = await perceptionLayer.buildOrganizationalPerception(companyId, {
      userId,
      teamMemberId,
      collectiveUserId
    });
    if (!perception.ok) {
      pulseObs.eventFailed();
      return perception;
    }

    const prevDims = await loadPreviousDimensions(companyId, userId, teamMemberId);
    const correlationPack = correlateHumanSignals(perception, prevDims);
    const indexPack = computePulseIndex(perception, correlationPack, prevDims);
    const temporalPack = await analyzeTemporalLearning(companyId, { userId, teamMemberId });
    const explainability = buildExplainability(indexPack, perception, correlationPack, temporalPack);

    await persistSubjectIndex(companyId, { userId, teamMemberId }, indexPack, perception, correlationPack);
    await recomputeAggregates(companyId);

    if ((correlationPack.patterns || []).length) {
      pulseObs.patternDetected(correlationPack.patterns.length);
    }
    pulseObs.indexUpdated();
    pulseObs.eventProcessed();

    await pulseAudit.logPulseCognitiveAction({
      companyId,
      traceId,
      eventType: 'index_recalculation',
      eventSource: 'event_ingestion',
      userId,
      action: 'index_updated',
      indicesRecalculated: [{ user_id: userId, team_member_id: teamMemberId, pulse_index: indexPack.pulse_index }],
      processingMs: Date.now() - t0,
      payload: { explainability_summary: explainability.conclusion_reason }
    });

    try {
      const orgState = require('./stateEngine').inferOrganizationalState(indexPack, correlationPack);
      require('./memory/organizationalMemoryFacade').scheduleMemoryCapture(companyId, {
        user_id: userId,
        scope_type: 'individual',
        scope_key: userId || teamMemberId,
        pulse_index: indexPack.pulse_index,
        organizational_state: orgState.state_code,
        confidence: indexPack.confidence,
        patterns: correlationPack.patterns || [],
        pattern_codes: (correlationPack.patterns || []).map((p) => p.code),
        proacao_count: perception.operational?.proacao_proposals_submitted,
        source: 'cognitive_snapshot'
      });
    } catch (_) {}

    return {
      ok: true,
      trace_id: traceId,
      pulse_index: indexPack.pulse_index,
      organizational_state: require('./stateEngine').inferOrganizationalState(indexPack, correlationPack)
        .state_code,
      explainability
    };
  } catch (err) {
    pulseObs.eventFailed();
    console.warn('[pulseCognitive][processSubject]', err?.message || err);
    return { ok: false, error: err?.message, trace_id: traceId };
  }
}

function scheduleProcessSubject(companyId, subject) {
  const key = `${companyId}:${subject.userId || ''}:${subject.teamMemberId || ''}`;
  if (processing.has(key)) return processing.get(key);
  const p = new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const result = await processSubject(companyId, subject);
        resolve(result);
      } catch (err) {
        console.warn('[pulseCognitive][schedule]', err?.message || err);
        resolve({ ok: false, error: err?.message });
      } finally {
        processing.delete(key);
      }
    }, DEBOUNCE_MS);
  });
  processing.set(key, p);
  return p;
}

/**
 * Processa evento: regista + agenda recálculo.
 */
async function ingestHumanEvent(companyId, event = {}) {
  pulseObs.eventReceived();
  const eventId = await recordEvent(companyId, event);
  const subject = {
    userId: event.user_id || null,
    teamMemberId: event.operational_team_member_id || null,
    collectiveUserId: event.collective_user_id || null
  };
  if (subject.userId || subject.teamMemberId) {
    scheduleProcessSubject(companyId, subject).catch(() => {});
  } else if (event.event_type === 'reconciliation_scan') {
    reconcileCompany(companyId).catch(() => {});
  }
  return { ok: true, event_id: eventId };
}

/**
 * Varredura de colaboradores elegíveis ao Pulse (reconciliação).
 */
async function reconcileCompany(companyId) {
  const pulseService = require('../pulseService');
  let processed = 0;
  try {
    const r = await db.query(
      `
      SELECT id FROM users
      WHERE company_id = $1 AND active = true AND deleted_at IS NULL
        AND COALESCE(is_factory_team_account, false) = false
    `,
      [companyId]
    );
    for (const row of r.rows || []) {
      const u = await pulseService.loadUser(companyId, row.id);
      if (!u || !pulseService.isSubjectToPulse(u.role)) continue;
      await processSubject(companyId, { userId: row.id });
      processed++;
    }
    await recomputeAggregates(companyId);
  } catch (err) {
    console.warn('[pulseCognitive][reconcile]', err?.message || err);
  }
  return { processed };
}

module.exports = {
  recordEvent,
  ingestHumanEvent,
  processSubject,
  scheduleProcessSubject,
  reconcileCompany
};
