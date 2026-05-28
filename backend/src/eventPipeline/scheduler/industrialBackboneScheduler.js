'use strict';

/**
 * Scheduler WAVE 2 — drain, recovery, archive, replay shadow (opt-in).
 */

const {
  isIndustrialBackboneSchedulerEnabled,
  isIndustrialEventsEnabled,
  isIndustrialOutboxEnabled,
  isIndustrialStreamRecoveryEnabled,
  isIndustrialArchiveEnabled,
  industrialReplayMode,
  industrialBackboneMode
} = require('../industrialFlags');

const DRAIN_MS = parseInt(process.env.IMPETUS_INDUSTRIAL_SCHEDULER_DRAIN_MS || '15000', 10) || 15000;
const RECOVERY_MS = parseInt(process.env.IMPETUS_INDUSTRIAL_SCHEDULER_RECOVERY_MS || '120000', 10) || 120000;
const ARCHIVE_MS = parseInt(process.env.IMPETUS_INDUSTRIAL_SCHEDULER_ARCHIVE_MS || '3600000', 10) || 3600000;
const REPLAY_MS = parseInt(process.env.IMPETUS_INDUSTRIAL_SCHEDULER_REPLAY_MS || '21600000', 10) || 21600000;

let _timers = [];
let _started = false;

function _safeInterval(fn, ms, label) {
  const t = setInterval(() => {
    fn().catch((err) => {
      console.warn(`[INDUSTRIAL_SCHEDULER_${label}]`, err?.message || err);
    });
  }, ms);
  if (typeof t.unref === 'function') t.unref();
  return t;
}

function startScheduler() {
  if (_started) return { started: false, reason: 'already_started' };
  if (!isIndustrialBackboneSchedulerEnabled() || !isIndustrialEventsEnabled()) {
    return { started: false, reason: 'scheduler_disabled' };
  }
  _started = true;

  if (isIndustrialOutboxEnabled()) {
    _timers.push(
      _safeInterval(async () => {
        const outbox = require('../outbox/industrialOutboxService');
        const replay = require('../replay/shadowReplayWorker');
        await outbox.drainOutboxBatch(replay.shadowReplayHandler);
      }, DRAIN_MS, 'DRAIN')
    );
  }

  if (isIndustrialStreamRecoveryEnabled()) {
    _timers.push(
      _safeInterval(async () => {
        const recovery = require('../recovery/streamRecoveryWorker');
        await recovery.runStreamRecovery({ limit: 300 });
      }, RECOVERY_MS, 'RECOVERY')
    );
  }

  if (isIndustrialArchiveEnabled()) {
    _timers.push(
      _safeInterval(async () => {
        const archive = require('../archive/industrialArchiveService');
        await archive.archiveDeliveredBatch();
      }, ARCHIVE_MS, 'ARCHIVE')
    );
  }

  const replayMode = industrialReplayMode();
  if (replayMode === 'shadow' || replayMode === 'audit') {
    _timers.push(
      _safeInterval(async () => {
        const orch = require('../replay/industrialReplayOrchestrator');
        await orch.runGovernedReplay({ limit: 100, source: 'outbox' });
      }, REPLAY_MS, 'REPLAY')
    );
  }

  return {
    started: true,
    intervals: { drain_ms: DRAIN_MS, recovery_ms: RECOVERY_MS, archive_ms: ARCHIVE_MS, replay_ms: REPLAY_MS },
    mode: industrialBackboneMode()
  };
}

function stopScheduler() {
  for (const t of _timers) clearInterval(t);
  _timers = [];
  _started = false;
}

function isSchedulerRunning() {
  return _started;
}

module.exports = {
  startScheduler,
  stopScheduler,
  isSchedulerRunning
};
