'use strict';

const fs = require('fs');
const path = require('path');
const phaseG = require('../explainability/config/phaseGFeatureFlags');
const { logPhaseG } = require('../explainability/phaseGLogger');

const { dataSubdir } = require('../config/impetusHome');
const AUDIT_DIR = process.env.IMPETUS_GOVERNANCE_AUDIT_DIR || dataSubdir('governance-audit');
const AUDIT_FILE = path.join(AUDIT_DIR, 'cognitive-governance-audit.jsonl');

const _memoryFeed = [];
const MAX_MEMORY = Number(process.env.IMPETUS_GOVERNANCE_AUDIT_MEMORY_MAX || 2000);

function _ensureDir() {
  try {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

/**
 * Append-only audit record (JSONL).
 */
function append(record) {
  if (!phaseG.isGovernanceAuditFeedEnabled()) return { appended: false };

  const line = JSON.stringify({
    ...record,
    audit_seq: _memoryFeed.length + 1,
    audit_appended_at: new Date().toISOString()
  });

  _memoryFeed.push(line);
  if (_memoryFeed.length > MAX_MEMORY) _memoryFeed.shift();

  try {
    _ensureDir();
    fs.appendFileSync(AUDIT_FILE, `${line}\n`, { encoding: 'utf8', flag: 'a' });
    logPhaseG('GOVERNANCE_AUDIT_APPENDED', { trace_id: record.trace_id });
  } catch (err) {
    console.warn('[GOVERNANCE_AUDIT_FEED]', err?.message);
  }

  return { appended: true };
}

function listFromMemory(limit = 100) {
  return _memoryFeed.slice(-limit).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return { raw: l };
    }
  });
}

/**
 * Fase I — activações / promoções (append-only).
 */
function appendActivation(record) {
  const phaseI = require('../governanceActivation/config/phaseIFeatureFlags');
  const phaseGOn = require('../explainability/config/phaseGFeatureFlags').isGovernanceAuditFeedEnabled();
  if (!phaseGOn && !phaseI.isControlledGovernanceActivationEnabled()) {
    return { appended: false };
  }
  return append({
    record_type: 'governance_activation',
    ...record
  });
}

/**
 * Fase J — operações / incidentes / emergência (append-only).
 */
function appendOperational(record) {
  const phaseJ = require('../governanceOperations/config/phaseJFeatureFlags');
  const phaseGOn = require('../explainability/config/phaseGFeatureFlags').isGovernanceAuditFeedEnabled();
  if (!phaseGOn && !phaseJ.isGovernanceOperationsEnabled()) {
    return { appended: false };
  }
  return append({
    record_type: 'governance_operations',
    ...record
  });
}

function clearForTests() {
  _memoryFeed.length = 0;
}

module.exports = {
  append,
  appendActivation,
  appendOperational,
  listFromMemory,
  clearForTests,
  AUDIT_FILE
};
