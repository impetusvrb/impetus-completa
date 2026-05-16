'use strict';

/**
 * WAVE 3 — preparação Timescale opt-in (sem create_hypertable automático).
 */

const flags = require('./storageFlags');

async function probeTimescaleExtension() {
  const result = {
    extension_installed: false,
    extension_version: null,
    hypertable_autocreate_enabled: flags.isTimescaleEnabled(),
    checked_at: new Date().toISOString()
  };

  try {
    const db = require('../db');
    const r = await db.query(
      `SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb' LIMIT 1`
    );
    if (r.rows && r.rows[0]) {
      result.extension_installed = true;
      result.extension_version = r.rows[0].extversion;
    }
  } catch (err) {
    result.error = err.message;
  }

  try {
    const db = require('../db');
    await db.query(
      `UPDATE impetus_timescale_readiness SET
         extension_installed = $2,
         extension_version = $3,
         hypertable_autocreate_enabled = $4,
         last_checked_at = now(),
         last_error = $5,
         updated_at = now()
       WHERE id = 1`,
      [
        result.extension_installed,
        result.extension_version,
        flags.isTimescaleEnabled(),
        result.error || null
      ]
    );
  } catch (_e) {}

  return result;
}

async function prepareTimescaleExtension() {
  if (!flags.isTimescalePrepareExtension()) {
    return { ok: false, reason: 'prepare_extension_disabled' };
  }
  try {
    const db = require('../db');
    await db.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');
    return probeTimescaleExtension();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function getReadiness() {
  if (!flags.isStorageV3Enabled()) {
    return { enabled: false, state: 'disabled' };
  }

  const probe = await probeTimescaleExtension();
  let state = 'postgres_only';
  if (probe.extension_installed && flags.isTimescaleEnabled()) state = 'hypertable_eligible';
  else if (probe.extension_installed) state = 'extension_ready';

  return {
    enabled: true,
    state,
    probe,
    hypertable_candidates: [
      'telemetry_timeseries_v1',
      'industrial_metric_rollups_v1',
      'industrial_telemetry_samples'
    ],
    autocreate_blocked: true,
    note: 'WAVE 3 não executa create_hypertable'
  };
}

module.exports = {
  probeTimescaleExtension,
  prepareTimescaleExtension,
  getReadiness
};
