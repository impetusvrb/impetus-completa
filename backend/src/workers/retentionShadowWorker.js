'use strict';

/**
 * Retention Shadow Worker — Scan-only, Zero Mutations
 *
 * Workers que analisam tabelas elegíveis para purge/anonymize
 * e emitem APENAS logs + métricas + estimativas de volume.
 *
 * Características:
 *   - NUNCA executa DELETE, UPDATE ou qualquer mutação
 *   - Apenas SELECT COUNT(*) e agregações
 *   - Emite structured logs compatíveis com observabilidade v2
 *   - Calcula volume estimado de purge por tabela
 *   - Respeita multi-tenant isolation (company_id scoping)
 *   - Controlado por IMPETUS_RETENTION_MODE=shadow
 *
 * Tabelas alvo (T1.7.2):
 *   - chat_messages (TTL 730d)
 *   - industrial_event_outbox (TTL 14d)
 *   - operational_memory (TTL 365d)
 *
 * Flag: IMPETUS_RETENTION_MODE=off|shadow|audit (default off)
 *   - off: worker não executa
 *   - shadow: scan + log + métricas (sem mutação)
 *   - audit: shadow + grava resultado em tabela de auditoria (futuro)
 */

const db = require('../db');
const registry = require('../governance/retentionPolicyRegistry');

const SCAN_TARGETS = Object.freeze([
  {
    table: 'chat_messages',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    joinForCompany: 'INNER JOIN chat_conversations cc ON cc.id = chat_messages.conversation_id',
    companyRef: 'cc.company_id',
    sizeEstimateBytes: 2048,
  },
  {
    table: 'industrial_event_outbox',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    joinForCompany: null,
    companyRef: 'company_id',
    sizeEstimateBytes: 4096,
  },
  {
    table: 'operational_memory',
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    joinForCompany: null,
    companyRef: 'company_id',
    sizeEstimateBytes: 1024,
  },
]);

let _lastScan = null;
let _scanCount = 0;
let _intervalHandle = null;

function getRetentionMode() {
  const v = String(process.env.IMPETUS_RETENTION_MODE || '').trim().toLowerCase();
  if (v === 'shadow' || v === 'audit' || v === 'pilot' || v === 'enforce') return v;
  return 'off';
}

function isShadowEnabled() {
  const mode = getRetentionMode();
  return mode !== 'off';
}

function _log(event, data) {
  try {
    const payload = {
      _type: 'retention_shadow',
      layer: 'DATA_LIFECYCLE',
      event,
      ts: new Date().toISOString(),
      mode: getRetentionMode(),
      ...data,
    };
    console.info('[RETENTION_SHADOW]', JSON.stringify(payload));
  } catch { /* never throw from logger */ }
}

/**
 * Executa scan shadow de uma tabela.
 * Retorna métricas sem qualquer mutação.
 */
async function _scanTable(target) {
  const policy = registry.getPolicy(target.table);
  if (!policy || policy.ttl_days === null) {
    return { table: target.table, skipped: true, reason: 'no_ttl_policy' };
  }

  const ttlDays = policy.ttl_days;
  const threshold = new Date(Date.now() - ttlDays * 86400000);

  try {
    const fromClause = target.joinForCompany
      ? `"${target.table}" ${target.joinForCompany}`
      : `"${target.table}"`;

    const totalResult = await db.query(
      `SELECT COUNT(*) as total FROM "${target.table}"`
    );
    const total = parseInt(totalResult.rows[0]?.total || 0);

    const expiredResult = await db.query(
      `SELECT COUNT(*) as expired FROM ${fromClause} WHERE "${target.table}"."${target.timestampColumn}" < $1`,
      [threshold]
    );
    const expired = parseInt(expiredResult.rows[0]?.expired || 0);

    let byTenant = [];
    try {
      const tenantResult = await db.query(
        `SELECT ${target.companyRef} as company_id, COUNT(*) as cnt 
         FROM ${fromClause} 
         WHERE "${target.table}"."${target.timestampColumn}" < $1 
         GROUP BY ${target.companyRef} 
         ORDER BY cnt DESC LIMIT 10`,
        [threshold]
      );
      byTenant = tenantResult.rows.map(r => ({
        company_id: r.company_id,
        expired_count: parseInt(r.cnt),
      }));
    } catch { /* tenant breakdown optional */ }

    const oldestResult = await db.query(
      `SELECT MIN("${target.timestampColumn}") as oldest FROM "${target.table}"`
    );
    const oldest = oldestResult.rows[0]?.oldest;

    const estimatedPurgeBytes = expired * target.sizeEstimateBytes;
    const purgePct = total > 0 ? ((expired / total) * 100).toFixed(2) : '0.00';

    return {
      table: target.table,
      skipped: false,
      policy: {
        ttl_days: ttlDays,
        action: policy.action,
        legal_basis: policy.legal_basis,
      },
      metrics: {
        total_rows: total,
        expired_rows: expired,
        purge_eligible_pct: parseFloat(purgePct),
        estimated_purge_bytes: estimatedPurgeBytes,
        estimated_purge_mb: parseFloat((estimatedPurgeBytes / (1024 * 1024)).toFixed(2)),
        threshold_date: threshold.toISOString(),
        oldest_record: oldest ? new Date(oldest).toISOString() : null,
      },
      tenant_breakdown: byTenant,
    };
  } catch (err) {
    return {
      table: target.table,
      skipped: false,
      error: err?.message,
    };
  }
}

/**
 * Executa scan completo de todas as tabelas alvo.
 * Emite logs estruturados e retorna relatório.
 */
async function executeShadowScan() {
  if (!isShadowEnabled()) {
    return { ok: false, reason: 'Retention mode is off (IMPETUS_RETENTION_MODE=off)' };
  }

  const startTime = Date.now();
  _scanCount++;

  _log('scan_started', { scan_number: _scanCount, targets: SCAN_TARGETS.length });

  const results = [];
  let totalExpired = 0;
  let totalPurgeBytes = 0;

  for (const target of SCAN_TARGETS) {
    const result = await _scanTable(target);
    results.push(result);

    if (!result.skipped && !result.error && result.metrics) {
      totalExpired += result.metrics.expired_rows;
      totalPurgeBytes += result.metrics.estimated_purge_bytes;

      _log('table_scanned', {
        table: result.table,
        total: result.metrics.total_rows,
        expired: result.metrics.expired_rows,
        purge_pct: result.metrics.purge_eligible_pct,
        estimated_mb: result.metrics.estimated_purge_mb,
        ttl_days: result.policy.ttl_days,
        action: result.policy.action,
      });
    } else if (result.error) {
      _log('table_scan_error', { table: result.table, error: result.error });
    }
  }

  const elapsed = Date.now() - startTime;

  const summary = {
    scan_number: _scanCount,
    mode: getRetentionMode(),
    tables_scanned: results.filter(r => !r.skipped).length,
    tables_skipped: results.filter(r => r.skipped).length,
    tables_errored: results.filter(r => r.error).length,
    total_expired_rows: totalExpired,
    total_estimated_purge_bytes: totalPurgeBytes,
    total_estimated_purge_mb: parseFloat((totalPurgeBytes / (1024 * 1024)).toFixed(2)),
    elapsed_ms: elapsed,
    mutations_executed: 0,
    scanned_at: new Date().toISOString(),
  };

  _lastScan = { summary, results, timestamp: new Date().toISOString() };

  _log('scan_completed', summary);

  return { ok: true, summary, results };
}

/**
 * Inicia o scheduler periódico (a cada 6h por default).
 * Apenas em shadow mode.
 */
function startScheduler(intervalMs = 6 * 3600 * 1000) {
  if (!isShadowEnabled()) {
    _log('scheduler_disabled', { reason: 'IMPETUS_RETENTION_MODE is off' });
    return false;
  }

  if (_intervalHandle) {
    return false;
  }

  _log('scheduler_started', { interval_ms: intervalMs, interval_hours: (intervalMs / 3600000).toFixed(1) });

  // First scan after 2 minutes (let boot complete)
  setTimeout(() => {
    executeShadowScan().catch(err => {
      _log('scheduled_scan_error', { error: err?.message });
    });
  }, 120000);

  _intervalHandle = setInterval(() => {
    executeShadowScan().catch(err => {
      _log('scheduled_scan_error', { error: err?.message });
    });
  }, intervalMs);

  if (_intervalHandle.unref) _intervalHandle.unref();

  return true;
}

function stopScheduler() {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    _log('scheduler_stopped', {});
    return true;
  }
  return false;
}

function getLastScan() {
  return _lastScan;
}

function getWorkerStats() {
  return {
    enabled: isShadowEnabled(),
    mode: getRetentionMode(),
    scan_count: _scanCount,
    scheduler_active: !!_intervalHandle,
    last_scan: _lastScan?.timestamp || null,
    targets: SCAN_TARGETS.map(t => t.table),
  };
}

module.exports = {
  getRetentionMode,
  isShadowEnabled,
  executeShadowScan,
  startScheduler,
  stopScheduler,
  getLastScan,
  getWorkerStats,
  SCAN_TARGETS,
};
