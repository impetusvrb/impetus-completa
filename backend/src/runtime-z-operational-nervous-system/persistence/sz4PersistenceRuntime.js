'use strict';

/**
 * SZ4 Persistence Runtime — enterprise-grade operational signal durability
 *
 * Flags:
 *   IMPETUS_SZ4_PERSISTENCE=on|off
 *   IMPETUS_SZ4_PERSISTENCE_PILOT_ONLY=true (default)
 *   IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS=<uuid> (optional; else promoted list)
 *   IMPETUS_SZ4_PERSISTENCE_TTL_DAYS=90
 *   IMPETUS_SZ4_PERSISTENCE_REPLAY_ON_BOOT=true
 *   IMPETUS_SZ4_PERSISTENCE_MAX_REPLAY_PER_TENANT=500
 *
 * Principles: async writes (setImmediate), pilot tenant gate, rollback via flag off,
 * audit trail on boot, no UX mutation, assistive-only preserved.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const flags = require('../config/sz4FeatureFlags');
const store = require('../_core/sz4TenantStore');

const LAYER = 'SZ4_PERSISTENCE';

const _stats = {
  writes_queued: 0,
  writes_ok: 0,
  writes_failed: 0,
  replay_rows: 0,
  replay_events: 0,
  purge_rows: 0,
  replay_tenants: 0,
  boot_recovery_ms: 0,
};

let _schemaOk = null;
let _recoveryDone = false;

function _log(event, data = {}) {
  try {
    console.info(`[${LAYER}]`, JSON.stringify({
      _type: 'sz4_persistence',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      ...data,
    }));
  } catch { /* never throw */ }
}

function isPersistenceGloballyEnabled() {
  return flags.isPersistenceEnabled();
}

function persistencePilotTenants() {
  const explicit = String(process.env.IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS || '').trim();
  if (explicit) {
    return explicit.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (flags.persistencePilotOnly()) {
    return flags.promotedTenants();
  }
  return [];
}

function isActiveForTenant(tenantId) {
  if (!isPersistenceGloballyEnabled()) return false;
  if (!tenantId) return false;
  if (!flags.persistencePilotOnly()) return true;
  const pilots = persistencePilotTenants();
  return pilots.length > 0 && pilots.includes(String(tenantId));
}

function ttlDays() {
  const v = parseInt(process.env.IMPETUS_SZ4_PERSISTENCE_TTL_DAYS || '90', 10);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 365) : 90;
}

function expiresAtIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ttlDays());
  return d.toISOString();
}

function replayOnBootEnabled() {
  const v = String(process.env.IMPETUS_SZ4_PERSISTENCE_REPLAY_ON_BOOT ?? 'true').trim().toLowerCase();
  return v === 'true' || v === 'on' || v === '1';
}

async function ensureSchema() {
  if (_schemaOk === true) return { ok: true, cached: true };
  try {
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '../../models/sz4_operational_persistence_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
    _schemaOk = true;
    return { ok: true };
  } catch (err) {
    _schemaOk = false;
    _log('schema_error', { error: err?.message });
    return { ok: false, error: err?.message };
  }
}

function enqueuePersist(tenantId, recordKind, recordId, threadId, payload) {
  if (!isActiveForTenant(tenantId)) {
    return { queued: false, reason: 'tenant_not_pilot_or_disabled' };
  }
  _stats.writes_queued += 1;
  setImmediate(() => {
    _persistRow(tenantId, recordKind, recordId, threadId, payload).catch(() => {});
  });
  return { queued: true };
}

async function _persistRow(tenantId, recordKind, recordId, threadId, payload) {
  try {
    const schema = await ensureSchema();
    if (!schema.ok) return;

    const exp = expiresAtIso();
    const payloadJson = JSON.stringify(payload || {});

    if (recordKind === 'event') {
      const eventId = recordId || uuidv4();
      await db.query(
        `INSERT INTO sz4_operational_persistence_records
         (tenant_id, record_kind, record_id, thread_id, payload, expires_at)
         VALUES ($1::uuid, 'event', $2, $3, $4::jsonb, $5::timestamptz)`,
        [tenantId, eventId, threadId || null, payloadJson, exp]
      );
    } else {
      await db.query(
        `INSERT INTO sz4_operational_persistence_records
         (tenant_id, record_kind, record_id, thread_id, payload, expires_at)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::timestamptz)
         ON CONFLICT (tenant_id, record_kind, record_id)
         DO UPDATE SET
           payload = EXCLUDED.payload,
           thread_id = EXCLUDED.thread_id,
           updated_at = now(),
           expires_at = EXCLUDED.expires_at`,
        [tenantId, recordKind, String(recordId), threadId || null, payloadJson, exp]
      );
    }
    _stats.writes_ok += 1;
    _maybeRecordApm(tenantId, recordKind);
  } catch (err) {
    _stats.writes_failed += 1;
    _log('write_error', { tenant_id: tenantId, kind: recordKind, error: err?.message });
  }
}

function _maybeRecordApm(tenantId, recordKind) {
  try {
    const apm = require('../../observability/apmEnterpriseBridge');
    if (!apm.isApmEnterpriseEnabled()) return;
    apm.recordGovernanceEvent('sz4_persistence_write', {
      tenant_id: tenantId,
      record_kind: recordKind,
    });
  } catch { /* optional */ }
}

function persistPipelineOutcome(tenantId, outcome = {}) {
  if (!isActiveForTenant(tenantId)) return { queued: false };

  const threadId = outcome.continuity?.thread_id || null;

  if (outcome.workflow?.id) {
    enqueuePersist(tenantId, 'workflow', outcome.workflow.id, threadId, outcome.workflow);
  }
  if (outcome.task?.id) {
    enqueuePersist(tenantId, 'task', outcome.task.id, threadId, outcome.task);
  }
  if (outcome.reminder?.id) {
    enqueuePersist(tenantId, 'reminder', outcome.reminder.id, threadId, outcome.reminder);
  }
  if (threadId) {
    const ctx = store.getThreadContext(tenantId, threadId);
    if (ctx) enqueuePersist(tenantId, 'thread', threadId, threadId, ctx);
  }
  for (const sig of outcome.awareness?.signals || []) {
    enqueuePersist(tenantId, 'event', null, threadId, {
      type: sig.type,
      severity: sig.severity,
      at: new Date().toISOString(),
      tenant_id: tenantId,
      thread_id: threadId,
    });
  }

  return { queued: true };
}

async function replayTenantState(tenantId) {
  if (!isActiveForTenant(tenantId)) return { ok: false, reason: 'not_pilot' };

  const schema = await ensureSchema();
  if (!schema.ok) return { ok: false, reason: 'schema', error: schema.error };

  const maxReplay = parseInt(process.env.IMPETUS_SZ4_PERSISTENCE_MAX_REPLAY_PER_TENANT || '500', 10) || 500;
  const kinds = ['thread', 'workflow', 'task', 'reminder'];
  let replayed = 0;

  for (const kind of kinds) {
    const res = await db.query(
      `SELECT DISTINCT ON (record_id) record_id, payload
       FROM sz4_operational_persistence_records
       WHERE tenant_id = $1::uuid
         AND record_kind = $2
         AND expires_at > now()
         AND record_id IS NOT NULL
       ORDER BY record_id, updated_at DESC
       LIMIT $3`,
      [tenantId, kind, maxReplay]
    );

    for (const row of res.rows || []) {
      const p = typeof row.payload === 'object' ? row.payload : {};
      try {
        if (kind === 'thread') {
          store.upsertThreadContext(tenantId, row.record_id, p);
        } else if (kind === 'workflow') {
          store.saveWorkflow(tenantId, p);
        } else if (kind === 'task') {
          store.saveTask(tenantId, p);
        } else if (kind === 'reminder') {
          store.saveReminder(tenantId, p);
        }
        replayed += 1;
      } catch (err) {
        _log('replay_row_error', { kind, error: err?.message });
      }
    }
  }

  const evRes = await db.query(
    `SELECT payload FROM sz4_operational_persistence_records
     WHERE tenant_id = $1::uuid AND record_kind = 'event' AND expires_at > now()
     ORDER BY created_at DESC LIMIT 100`,
    [tenantId]
  );
  let events = 0;
  for (const row of evRes.rows || []) {
    const p = typeof row.payload === 'object' ? row.payload : {};
    if (p.type) {
      store.recordEvent(p.type, { tenant_id: tenantId, thread_id: p.thread_id, severity: p.severity });
      events += 1;
    }
  }

  _stats.replay_rows += replayed;
  _stats.replay_events += events;
  return { ok: true, replayed, events };
}

async function warmRecoveryOnBoot() {
  if (!isPersistenceGloballyEnabled()) {
    return { skipped: true, reason: 'persistence_off' };
  }
  if (_recoveryDone) return { cached: true };
  if (!replayOnBootEnabled()) {
    return { skipped: true, reason: 'replay_disabled' };
  }

  const t0 = Date.now();
  const schema = await ensureSchema();
  if (!schema.ok) return { ok: false, error: schema.error };

  const tenants = persistencePilotTenants();
  const results = [];
  for (const tid of tenants) {
    const r = await replayTenantState(tid);
    results.push({ tenant_id: tid, ...r });
    if (r.ok) _stats.replay_tenants += 1;
  }

  _stats.boot_recovery_ms = Date.now() - t0;
  _recoveryDone = true;
  _log('boot_recovery', { tenants: tenants.length, ms: _stats.boot_recovery_ms });
  return { ok: true, tenants: tenants.length, results, ms: _stats.boot_recovery_ms };
}

async function purgeExpired() {
  if (!isPersistenceGloballyEnabled()) return { purged: 0 };
  const schema = await ensureSchema();
  if (!schema.ok) return { purged: 0, error: schema.error };
  try {
    const res = await db.query(
      'DELETE FROM sz4_operational_persistence_records WHERE expires_at < now()'
    );
    const n = res.rowCount || 0;
    _stats.purge_rows += n;
    if (n > 0) _log('purge_expired', { count: n });
    return { purged: n };
  } catch (err) {
    _log('purge_error', { error: err?.message });
    return { purged: 0, error: err?.message };
  }
}

function getDiagnostics() {
  return {
    enabled: isPersistenceGloballyEnabled(),
    pilot_only: flags.persistencePilotOnly(),
    pilot_tenants: persistencePilotTenants(),
    ttl_days: ttlDays(),
    replay_on_boot: replayOnBootEnabled(),
    schema_ok: _schemaOk,
    recovery_done: _recoveryDone,
    stats: { ..._stats },
  };
}

function getHealth() {
  const diag = getDiagnostics();
  let status = 'disabled';
  if (diag.enabled) {
    status = diag.schema_ok === false ? 'degraded' : 'healthy';
  }
  return { status, ...diag };
}

async function emitBootAuditTrail() {
  if (!isPersistenceGloballyEnabled()) return { emitted: false, reason: 'disabled' };
  const diag = getDiagnostics();
  _log('boot_audit', diag);
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('sz4_persistence_boot', 'runtime_z_sz4', $1, 'system:sz4_persistence', NOW(), NULL)`,
      [JSON.stringify(diag)]
    );
    return { emitted: true };
  } catch (err) {
    _log('boot_audit_error', { error: err?.message });
    return { emitted: false, error: err?.message };
  }
}

module.exports = {
  isActiveForTenant,
  ensureSchema,
  enqueuePersist,
  persistPipelineOutcome,
  replayTenantState,
  warmRecoveryOnBoot,
  purgeExpired,
  getDiagnostics,
  getHealth,
  emitBootAuditTrail,
};
