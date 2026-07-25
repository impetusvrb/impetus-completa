'use strict';

/**
 * SEC-21 — Promoção operacional de flags (process.env + safe constraints).
 */

const sequence = require('../config/activationSequence');

function captureCurrentFlags() {
  const current = {};
  for (const entry of sequence.PRIMARY_FLAGS) {
    current[entry.flag] = process.env[entry.flag] ?? null;
  }
  for (const [k, v] of Object.entries(sequence.SAFE_MODE_CONSTRAINTS)) {
    current[k] = process.env[k] ?? null;
  }
  current.SECURITY_PRODUCTION_ACTIVATION = process.env.SECURITY_PRODUCTION_ACTIVATION ?? null;
  return current;
}

function applyPromotion(options = {}) {
  const before = captureCurrentFlags();
  const applied = [];
  const constraints = [];

  for (const entry of sequence.PRIMARY_FLAGS) {
    process.env[entry.flag] = 'true';
    applied.push({ phase: entry.phase, flag: entry.flag, value: 'true' });
  }

  for (const [key, value] of Object.entries(sequence.SAFE_MODE_CONSTRAINTS)) {
    if (options.skipGitCheck && key === 'SEC04_SKIP_GIT_CHECK') continue;
    process.env[key] = value;
    constraints.push({ key, value });
  }

  process.env.SECURITY_PRODUCTION_ACTIVATION = 'true';

  if (options.skipGitCheck) {
    process.env.SEC04_SKIP_GIT_CHECK = 'true';
    constraints.push({ key: 'SEC04_SKIP_GIT_CHECK', value: 'true', note: 'test-only' });
  }

  return {
    ok: true,
    before,
    after: captureCurrentFlags(),
    applied,
    constraints,
    auto_execute: sequence.AUTO_EXECUTE,
    forbidden: sequence.FORBIDDEN_AUTO_ACTIONS,
    promotedAt: new Date().toISOString()
  };
}

function verifyPromotion() {
  const failures = [];
  for (const entry of sequence.PRIMARY_FLAGS) {
    const val = process.env[entry.flag];
    if (val !== 'true' && val !== '1') {
      failures.push({ flag: entry.flag, expected: 'true', actual: val });
    }
  }
  if (process.env.SECURITY_RESPONSE_PROTECT_ENABLED === 'true') {
    failures.push({ flag: 'SECURITY_RESPONSE_PROTECT_ENABLED', issue: 'must remain false' });
  }
  return { ok: failures.length === 0, failures };
}

function buildPromotionEnvFile() {
  const lines = ['# SEC-21 — Enterprise Production Security Activation', `# Generated: ${new Date().toISOString()}`, ''];
  for (const entry of sequence.PRIMARY_FLAGS) {
    lines.push(`${entry.flag}=true`);
  }
  lines.push('SECURITY_PRODUCTION_ACTIVATION=true');
  lines.push('');
  lines.push('# Safe mode constraints (obrigatório)');
  for (const [k, v] of Object.entries(sequence.SAFE_MODE_CONSTRAINTS)) {
    lines.push(`${k}=${v}`);
  }
  return lines.join('\n');
}

module.exports = {
  captureCurrentFlags,
  applyPromotion,
  verifyPromotion,
  buildPromotionEnvFile
};
