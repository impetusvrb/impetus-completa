'use strict';

/**
 * CERT-EVENT-RETENTION-01 — Event Retention Engine
 * Identifica elegíveis, aplica políticas, move estados, regista auditoria. Nunca purge direto.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const observability = require('../../services/observabilityService');
const { LIFECYCLE_STATES, canTransition, assertTransition } = require('./eventLifecycleStates');
const { classifyEvent } = require('./eventBackboneCategoryRegistry');
const eventArchive = require('./eventArchiveService');

const POLICY_VERSION = '1.0.0';

function _isEnabled() {
  const v = String(process.env.IMPETUS_EVENT_RETENTION_ENGINE || 'shadow').trim().toLowerCase();
  return v !== 'off' && v !== 'false' && v !== '0';
}

function _mode() {
  const v = String(process.env.IMPETUS_EVENT_RETENTION_MODE || 'shadow').trim().toLowerCase();
  return ['shadow', 'active'].includes(v) ? v : 'shadow';
}

function _purgeExplicitlyAllowed() {
  return String(process.env.IMPETUS_EVENT_RETENTION_ALLOW_PURGE || 'false').trim().toLowerCase() === 'true';
}

async function loadPolicies() {
  try {
    const r = await db.query(`SELECT * FROM event_backbone_retention_policy ORDER BY category`);
    return r.rows || [];
  } catch (err) {
    if (err?.message?.includes('does not exist')) {
      return [];
    }
    throw err;
  }
}

async function recordLifecycleAudit(entry) {
  const traceId = entry.trace_id || uuidv4();
  try {
    await db.query(
      `INSERT INTO event_backbone_lifecycle_audit
       (trace_id, event_ref_id, source_table, event_name, domain, company_id, category,
        from_state, to_state, policy_id, policy_version, reason, scheduler_run_id,
        actor_type, actor_id, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
      [
        traceId,
        entry.event_ref_id || null,
        entry.source_table || 'industrial_event_archive',
        entry.event_name || null,
        entry.domain || null,
        entry.company_id || null,
        entry.category || null,
        entry.from_state || null,
        entry.to_state,
        entry.policy_id || null,
        entry.policy_version || POLICY_VERSION,
        entry.reason || 'retention_policy',
        entry.scheduler_run_id || null,
        entry.actor_type || 'scheduler',
        entry.actor_id || 'eventRetentionEngine',
        JSON.stringify(entry.metadata || {})
      ]
    );
  } catch (err) {
    console.warn('[EVENT_RETENTION_AUDIT]', err?.message || err);
  }
  return traceId;
}

async function transitionArchiveState(row, toState, ctx = {}) {
  const fromState = row.lifecycle_state || LIFECYCLE_STATES.ARCHIVED;
  if (!canTransition(fromState, toState)) {
    return { ok: false, reason: 'invalid_transition', from: fromState, to: toState };
  }
  assertTransition(fromState, toState);

  if (_mode() === 'shadow') {
    const traceId = await recordLifecycleAudit({
      ...ctx,
      event_ref_id: row.id,
      event_name: row.event_name,
      domain: row.domain,
      company_id: row.company_id,
      category: row.event_category,
      from_state: fromState,
      to_state: toState,
      metadata: { ...ctx.metadata, shadow: true }
    });
    return { ok: true, shadow: true, trace_id: traceId, from: fromState, to: toState };
  }

  const tsCol =
    toState === LIFECYCLE_STATES.HISTORICAL
      ? 'historical_at'
      : toState === LIFECYCLE_STATES.PURGE_ELIGIBLE
        ? 'purge_eligible_at'
        : null;

  let sql = `UPDATE industrial_event_archive SET lifecycle_state = $2`;
  const params = [row.id, toState];
  if (tsCol) {
    sql += `, ${tsCol} = now()`;
  }
  sql += ` WHERE id = $1::uuid`;
  await db.query(sql, params);

  const traceId = await recordLifecycleAudit({
    ...ctx,
    event_ref_id: row.id,
    event_name: row.event_name,
    domain: row.domain,
    company_id: row.company_id,
    category: row.event_category,
    from_state: fromState,
    to_state: toState
  });

  observability.incrementMetric('event_retention_processed');
  return { ok: true, trace_id: traceId, from: fromState, to: toState };
}

/**
 * Identifica registos arquivados elegíveis para HISTORICAL ou PURGE_ELIGIBLE.
 */
async function evaluateArchivedEligibility(policy, opts = {}) {
  const batchSize = Math.min(500, Math.max(1, Number(opts.batch_size) || 100));
  if (!policy) return { candidates: [], policy: null };

  const archiveDays = Number(policy.archive_days) || 365;
  const historicalDays = policy.historical_days != null ? Number(policy.historical_days) : null;
  const archiveCutoff = new Date(Date.now() - archiveDays * 86400000).toISOString();

  const params = [policy.category, archiveCutoff, batchSize];
  const r = await db.query(
    `SELECT id, event_name, domain, company_id, lifecycle_state, event_category, archived_at
     FROM industrial_event_archive
     WHERE event_category = $1
       AND lifecycle_state = 'ARCHIVED'
       AND archived_at < $2::timestamptz
     ORDER BY archived_at ASC
     LIMIT $3`,
    params
  );

  let historicalCandidates = [];
  if (historicalDays != null && historicalDays > 0) {
    const histCutoff = new Date(Date.now() - historicalDays * 86400000).toISOString();
    const hr = await db.query(
      `SELECT id, event_name, domain, company_id, lifecycle_state, event_category, archived_at
       FROM industrial_event_archive
       WHERE event_category = $1
         AND lifecycle_state = 'HISTORICAL'
         AND archived_at < $2::timestamptz
       ORDER BY archived_at ASC
       LIMIT $3`,
      [policy.category, histCutoff, batchSize]
    );
    historicalCandidates = hr.rows || [];
  }

  return {
    policy,
    to_historical: r.rows || [],
    to_purge_eligible: historicalCandidates,
    archive_cutoff: archiveCutoff
  };
}

/**
 * Ciclo principal de retenção — nunca remove dados; apenas transições de estado.
 */
async function runRetentionCycle(opts = {}) {
  const started = Date.now();
  const runId = opts.run_id || uuidv4();

  if (!_isEnabled()) {
    return { ok: false, reason: 'engine_disabled', run_id: runId };
  }

  observability.incrementMetric('event_active');

  const policies = await loadPolicies();
  const results = {
    ok: true,
    run_id: runId,
    mode: _mode(),
    policies_applied: 0,
    transitions: [],
    archive_batch: null,
    compression: null,
    errors: []
  };

  try {
    results.archive_batch = await eventArchive.archiveWithLifecycle({
      batch_size: opts.archive_batch_size,
      company_id: opts.company_id,
      delivered_days: opts.delivered_days
    });
  } catch (err) {
    results.errors.push({ step: 'archive', error: err?.message });
    observability.incrementMetric('event_retention_failed');
  }

  for (const policy of policies) {
    if (policy.purge_allowed && !_purgeExplicitlyAllowed()) {
      continue;
    }
    try {
      const elig = await evaluateArchivedEligibility(policy, opts);
      results.policies_applied += 1;

      for (const row of elig.to_historical) {
        const tr = await transitionArchiveState(row, LIFECYCLE_STATES.HISTORICAL, {
          policy_id: policy.id,
          scheduler_run_id: runId,
          reason: `archive_older_than_${policy.archive_days}d`
        });
        results.transitions.push(tr);
      }

      if (policy.purge_allowed && _purgeExplicitlyAllowed()) {
        for (const row of elig.to_purge_eligible) {
          const tr = await transitionArchiveState(row, LIFECYCLE_STATES.PURGE_ELIGIBLE, {
            policy_id: policy.id,
            scheduler_run_id: runId,
            reason: `historical_older_than_${policy.historical_days}d`
          });
          results.transitions.push(tr);
          observability.incrementMetric('event_purge_candidates');
        }
      }
    } catch (err) {
      results.errors.push({ step: 'policy', policy_id: policy.id, error: err?.message });
      observability.incrementMetric('event_retention_failed');
    }
  }

  if (opts.compress !== false && _mode() === 'active') {
    try {
      results.compression = await eventArchive.compressArchivedBatch({ batch_size: opts.compress_batch_size });
      if (results.compression?.compressed) {
        observability.incrementMetric('event_archive_size');
      }
    } catch (err) {
      results.errors.push({ step: 'compress', error: err?.message });
    }
  }

  const duration = Date.now() - started;
  observability.incrementMetric('event_retention_duration');
  observability.incrementMetric('event_archived');

  console.info(
    '[EVENT_RETENTION_CYCLE]',
    JSON.stringify({
      run_id: runId,
      mode: _mode(),
      policies: results.policies_applied,
      transitions: results.transitions.length,
      duration_ms: duration,
      errors: results.errors.length
    })
  );

  return { ...results, duration_ms: duration };
}

async function getRetentionDiagnostics() {
  const policies = await loadPolicies();
  let auditCount = 0;
  try {
    const r = await db.query(`SELECT COUNT(*)::int AS c FROM event_backbone_lifecycle_audit`);
    auditCount = r.rows?.[0]?.c || 0;
  } catch (_e) {
    auditCount = -1;
  }
  const stats = await eventArchive.getArchiveStatistics().catch(() => ({ ok: false }));
  return {
    enabled: _isEnabled(),
    mode: _mode(),
    purge_allowed: _purgeExplicitlyAllowed(),
    policy_version: POLICY_VERSION,
    policies_count: policies.length,
    policies,
    lifecycle_audit_entries: auditCount,
    archive_stats: stats
  };
}

/**
 * Classifica e persiste categoria em outbox ativo (aditivo, não bloqueia publish).
 */
async function enrichOutboxCategory(outboxId, partial = {}) {
  const category = classifyEvent(partial);
  try {
    await db.query(
      `UPDATE industrial_event_outbox
       SET event_category = COALESCE(event_category, $2),
           lifecycle_state = COALESCE(lifecycle_state, 'ACTIVE')
       WHERE id = $1::uuid`,
      [outboxId, category]
    );
  } catch (_e) {
    /* migration pendente — noop */
  }
  return category;
}

module.exports = {
  runRetentionCycle,
  evaluateArchivedEligibility,
  transitionArchiveState,
  recordLifecycleAudit,
  loadPolicies,
  getRetentionDiagnostics,
  enrichOutboxCategory,
  classifyEvent
};
