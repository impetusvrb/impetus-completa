'use strict';

/**
 * SEC-13 — Rollback Executor.
 */

const journal = require('./executionJournalService');
const metrics = require('../metrics/controlledExecutionMetrics');

function executeRollback(executionRecord) {
  if (!executionRecord?.rollback) {
    return { ok: false, reason: 'no_rollback_defined' };
  }

  const rb = executionRecord.rollback;
  const start = Date.now();

  try {
    switch (rb.action) {
      case 'restore_log_level':
        journal.setSecurityLogLevel(rb.previous || 'info');
        break;
      case 'close_internal_incident':
        journal.closeInternalIncident(rb.internalIncidentId);
        break;
      case 'discard_snapshot':
      case 'discard_report':
      case 'none_required':
      case 'none':
        break;
      default:
        return { ok: false, reason: `unknown_rollback:${rb.action}` };
    }

    metrics.increment('rollbacks');
    return {
      ok: true,
      rollbackId: `rb-${Date.now()}`,
      action: rb.action,
      durationMs: Date.now() - start,
      executionId: executionRecord.executionId
    };
  } catch (e) {
    return { ok: false, reason: e?.message || 'rollback_failed' };
  }
}

module.exports = { executeRollback };
