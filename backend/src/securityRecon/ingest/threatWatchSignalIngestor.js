'use strict';

const fs = require('fs');
const path = require('path');
const flags = require('../config/securityReconFlags');
const engine = require('../engine/securityReconCorrelationEngine');
const {
  normalizeFromThreatWatchLine,
  normalizeFromThreatIncidentJson
} = require('../engine/signalNormalizer');

const THREAT_LOG = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';
const INCIDENT_DIR = process.env.IMPETUS_THREAT_INCIDENT_DIR || '/var/lib/impetus/incidents';

let offset = 0;
let incidentOffsetMs = 0;
let timer = null;

function readNewThreatLogLines() {
  if (!fs.existsSync(THREAT_LOG)) return [];
  const stat = fs.statSync(THREAT_LOG);
  if (stat.size < offset) offset = 0;

  const fd = fs.openSync(THREAT_LOG, 'r');
  const len = stat.size - offset;
  if (len <= 0) {
    fs.closeSync(fd);
    return [];
  }

  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, offset);
  fs.closeSync(fd);
  offset = stat.size;

  return buf.toString('utf8').split('\n').filter(Boolean);
}

function ingestThreatLogLines(lines) {
  let count = 0;
  for (const line of lines) {
    const signal = normalizeFromThreatWatchLine(line);
    if (!signal) continue;
    engine.ingestSignal(signal);
    count += 1;
  }
  return count;
}

function ingestRecentIncidents(maxAgeMs = 300000) {
  if (!fs.existsSync(INCIDENT_DIR)) return 0;
  const now = Date.now();
  let count = 0;

  for (const name of fs.readdirSync(INCIDENT_DIR)) {
    if (!name.endsWith('.json') || name === 'latest.json') continue;
    const full = path.join(INCIDENT_DIR, name);
    try {
      const st = fs.statSync(full);
      if (st.mtimeMs <= incidentOffsetMs) continue;
      if (now - st.mtimeMs > maxAgeMs) continue;
      const doc = JSON.parse(fs.readFileSync(full, 'utf8'));
      const signal = normalizeFromThreatIncidentJson(doc);
      if (signal) {
        engine.ingestSignal(signal);
        count += 1;
      }
      if (st.mtimeMs > incidentOffsetMs) incidentOffsetMs = st.mtimeMs;
    } catch (_e) {
      /* skip malformed */
    }
  }
  return count;
}

function tick() {
  try {
    const lines = readNewThreatLogLines();
    ingestThreatLogLines(lines);
    ingestRecentIncidents();
  } catch (e) {
    console.warn('[SEC-RECON] threat-watch ingest:', e?.message || e);
  }
}

function start() {
  if (timer) return;
  tick();
  timer = setInterval(tick, flags.threatWatchIngestIntervalMs());
  if (typeof timer.unref === 'function') timer.unref();
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function resetOffset() {
  offset = 0;
  incidentOffsetMs = 0;
}

module.exports = {
  start,
  stop,
  tick,
  readNewThreatLogLines,
  ingestThreatLogLines,
  resetOffset,
  THREAT_LOG,
  INCIDENT_DIR
};
