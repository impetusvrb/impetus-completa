'use strict';

const fs = require('fs');
const path = require('path');
const bootstrapFlags = require('./config/bootstrapFeatureFlags');
const { logBootstrap } = require('./bootstrapLogger');

const LOG_DIR = process.env.IMPETUS_GOVERNANCE_SHADOW_LOG_DIR ||
  path.join(__dirname, '..', '..', 'logs', 'governance-shadow-runtime');
const AGGREGATE_FILE = path.join(LOG_DIR, 'shadow-runtime-aggregate.jsonl');

const _buffer = {
  shadow_divergence: [],
  governance_conflicts: [],
  cross_domain_attempts: [],
  runtime_degradation: [],
  contextual_anomalies: [],
  orphan_pipelines: [],
  legacy_routes: [],
  ungoverned_entrypoints: []
};

function _ensureDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

function recordShadowEvent(type, payload = {}) {
  if (!bootstrapFlags.isGlobalShadowObservationEnabled() && !payload.force) return { recorded: false };

  const entry = {
    type,
    recorded_at: new Date().toISOString(),
    ...payload
  };

  const list = _buffer[type] || (_buffer[type] = []);
  list.push(entry);
  if (list.length > 500) list.shift();

  try {
    _ensureDir();
    fs.appendFileSync(AGGREGATE_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (err) {
    console.warn('[GOVERNANCE_SHADOW_COLLECTOR]', err?.message);
  }

  logBootstrap('PRODUCTION_GOVERNANCE_OBSERVATION', { type, channel: payload.channel });

  return { recorded: true, type };
}

function recordDivergence(channel, diff, meta = {}) {
  return recordShadowEvent('shadow_divergence', { channel, diff, ...meta });
}

function recordCrossDomainAttempt(meta = {}) {
  return recordShadowEvent('cross_domain_attempts', meta);
}

function recordContextualAnomaly(meta = {}) {
  return recordShadowEvent('contextual_anomalies', meta);
}

function getAggregateSummary() {
  const summary = {};
  for (const [key, items] of Object.entries(_buffer)) {
    summary[key] = { count: items.length, recent: items.slice(-5) };
  }
  summary.log_dir = LOG_DIR;
  summary.aggregate_file = AGGREGATE_FILE;
  return summary;
}

function clearForTests() {
  for (const k of Object.keys(_buffer)) _buffer[k].length = 0;
}

module.exports = {
  LOG_DIR,
  recordShadowEvent,
  recordDivergence,
  recordCrossDomainAttempt,
  recordContextualAnomaly,
  getAggregateSummary,
  clearForTests
};
