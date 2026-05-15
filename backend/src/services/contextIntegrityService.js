'use strict';

/**
 * IMPETUS — Context Integrity Layer
 * Verificação criptográfica e semântica do contexto cognitivo (tenant, hash, poisoning).
 * Rollout: IMPETUS_CONTEXT_INTEGRITY_ENABLED + IMPETUS_CONTEXT_INTEGRITY_BLOCK_MODE
 */

const crypto = require('crypto');

const INTEGRITY_VERSION = 1;

const EPHEMERAL_KEYS = new Set([
  'generated_at',
  'timestamp',
  '_ephemeral',
  'integrity',
  'envelope',
  'trace_id',
  'traceId',
  'latency_ms',
  'request_id'
]);

const FORBIDDEN_METADATA_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'is_admin',
  'isAdmin',
  'superuser',
  'bypass_role',
  'bypassRole',
  'impersonate_user_id',
  'impersonate_company_id',
  'skip_all_checks',
  'eval',
  'exec'
]);

const FORBIDDEN_CONTEXT_SNIPPETS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s*:\s*you\s+are\s+now/i,
  /<\s*script/i,
  /javascript\s*:/i,
  /\badmin_override\b/i,
  /\broot\s*#\b/i
];

let _verifiedContexts = 0;
let _integrityFailures = 0;
let _poisoningAttempts = 0;
let _crossTenantBlocks = 0;
let _oversizedContexts = 0;

const _recentEvents = [];
const MAX_EVENTS = 50;

const _flowByTrace = new Map();

function _pushEvent(row) {
  _recentEvents.push({ ...row, at: new Date().toISOString() });
  while (_recentEvents.length > MAX_EVENTS) _recentEvents.shift();
}

function _pruneFlowMap() {
  const now = Date.now();
  for (const [k, v] of _flowByTrace) {
    if (now - (v.ts || 0) > 120000) _flowByTrace.delete(k);
  }
}

function recordIntegrityFlowTrace(traceId, snap) {
  if (!traceId) return;
  _pruneFlowMap();
  _flowByTrace.set(String(traceId), { ...snap, ts: Date.now() });
}

function consumeIntegrityFlowTrace(traceId) {
  if (!traceId) return null;
  const k = String(traceId);
  const v = _flowByTrace.get(k);
  _flowByTrace.delete(k);
  return v || null;
}

function isContextIntegrityEnabled() {
  return String(process.env.IMPETUS_CONTEXT_INTEGRITY_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function isBlockMode() {
  return String(process.env.IMPETUS_CONTEXT_INTEGRITY_BLOCK_MODE || '')
    .trim()
    .toLowerCase() === 'true';
}

function maxContextSizeBytes() {
  const kb = Number(process.env.MAX_CONTEXT_SIZE_KB || process.env.IMPETUS_MAX_CONTEXT_SIZE_KB || 256);
  const n = Number.isFinite(kb) && kb > 0 ? kb : 256;
  const clampedKb = Math.min(4096, Math.max(1, n));
  return clampedKb * 1024;
}

function maxMetadataFields() {
  const n = Number(process.env.MAX_METADATA_FIELDS || 64);
  return Number.isFinite(n) && n > 0 ? Math.min(512, n) : 64;
}

function maxContextDepth() {
  const n = Number(process.env.MAX_CONTEXT_DEPTH || 12);
  return Number.isFinite(n) && n > 0 ? Math.min(32, n) : 12;
}

function stableSerialize(value, depth = 0) {
  const maxD = maxContextDepth();
  if (depth > maxD) return '"[DEPTH]"';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((x) => stableSerialize(x, depth + 1)).join(',')}]`;
  }
  const keys = Object.keys(value)
    .filter((k) => !EPHEMERAL_KEYS.has(k))
    .sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(value[k], depth + 1)}`);
  return `{${parts.join(',')}}`;
}

/**
 * Hash determinístico SHA-256 sobre payload canónico (sem campos efémeros).
 * @param {object} context — { body, scope, permissions, company_id, data_state }
 */
function generateContextHash(context) {
  const c = context && typeof context === 'object' ? context : {};
  const payload = {
    body: String(c.body != null ? c.body : ''),
    scope: c.scope && typeof c.scope === 'object' ? c.scope : {},
    permissions: Array.isArray(c.permissions) ? c.permissions.map(String).sort() : [],
    company_id: c.company_id != null ? String(c.company_id).trim() : '',
    data_state: c.data_state != null ? String(c.data_state).trim() : 'unknown'
  };
  const canonical = stableSerialize(payload);
  const context_hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  const generated_at = new Date().toISOString();
  const tenant_scope = payload.company_id || 'unscoped';
  try {
    console.info(
      '[CONTEXT_HASH]',
      JSON.stringify({ context_hash: context_hash.slice(0, 16) + '…', tenant_scope: tenant_scope.slice(0, 36) })
    );
  } catch (_e) {}
  return { context_hash, generated_at, tenant_scope };
}

function buildContextIntegrityEnvelope({
  context_hash,
  company_id,
  channel,
  data_state,
  scope,
  timestamp
}) {
  const sc = scope && typeof scope === 'object' ? scope : {};
  const scopeArr = Object.keys(sc)
    .sort()
    .map((k) => `${k}:${sc[k] === true ? '1' : sc[k] === false ? '0' : String(sc[k])}`);
  return {
    context_hash: String(context_hash || ''),
    company_id: company_id != null ? String(company_id).trim() : '',
    channel: channel != null ? String(channel).slice(0, 128) : 'unknown',
    integrity_version: INTEGRITY_VERSION,
    data_state: data_state != null ? String(data_state).trim() : 'unknown',
    scope: scopeArr,
    timestamp: timestamp || new Date().toISOString()
  };
}

function countMetadataKeys(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > maxContextDepth()) return 0;
  let n = Object.keys(obj).length;
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) n += countMetadataKeys(v, depth + 1);
  }
  return n;
}

function analyzePoisoningSignals({ contextText, metadata, identity }) {
  const reasons = [];
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  for (const k of Object.keys(meta)) {
    const low = k.toLowerCase();
    if (FORBIDDEN_METADATA_KEYS.has(k) || FORBIDDEN_METADATA_KEYS.has(low)) {
      reasons.push(`forbidden_meta_key:${k}`);
    }
  }
  if (Object.keys(meta).length > maxMetadataFields()) {
    reasons.push('metadata_field_explosion');
  }
  const txt = String(contextText || '');
  for (const re of FORBIDDEN_CONTEXT_SNIPPETS) {
    if (re.test(txt)) reasons.push('injection_pattern');
  }
  if (identity && identity.company_id) {
    const reC = /"company_id"\s*:\s*"([0-9a-fA-F-]{36})"/g;
    let m;
    const seen = new Set();
    while ((m = reC.exec(txt))) {
      seen.add(m[1].toLowerCase());
    }
    for (const id of seen) {
      if (id !== String(identity.company_id).toLowerCase()) {
        reasons.push('embedded_foreign_company_id');
        break;
      }
    }
  }
  return reasons;
}

function detectContextPoisoning({ contextText, metadata, identity }) {
  const reasons = analyzePoisoningSignals({ contextText, metadata, identity });
  if (reasons.length) {
    _poisoningAttempts += 1;
    try {
      console.warn('[CONTEXT_POISONING]', JSON.stringify({ reasons, company_id: identity?.company_id }));
    } catch (_e) {}
    _pushEvent({ type: 'poisoning', reasons });
  }
  return { poisoned: reasons.length > 0, reasons };
}

function analyzeCrossTenantSignals({ contextText, identity }) {
  const reasons = [];
  const cid = identity && identity.company_id ? String(identity.company_id).trim().toLowerCase() : '';
  const txt = String(contextText || '');
  if (/impersonate_company_id|tenant_override|foreign_company_id|other_company_id/i.test(txt)) {
    reasons.push('suspect_tenant_marker');
  }
  const re = /"company_id"\s*:\s*"([0-9a-fA-F-]{36})"/g;
  const tenants = new Set();
  let m;
  while ((m = re.exec(txt))) {
    tenants.add(m[1].toLowerCase());
  }
  if (cid && tenants.size > 1) {
    reasons.push('mixed_tenant_company_id_json');
  }
  return reasons;
}

function detectCrossTenantLeakage({ contextText, identity }) {
  const reasons = analyzeCrossTenantSignals({ contextText, identity });
  if (reasons.length) {
    _crossTenantBlocks += 1;
    try {
      const cid = identity && identity.company_id ? String(identity.company_id).trim().toLowerCase() : '';
      console.warn('[CONTEXT_CROSS_TENANT]', JSON.stringify({ reasons, tenant: cid ? cid.slice(0, 8) + '…' : null }));
    } catch (_e) {}
    _pushEvent({ type: 'cross_tenant', reasons });
  }
  return { leaked: reasons.length > 0, reasons };
}

/**
 * Trunca texto de contexto de forma segura (marcador final).
 */
function truncateContextBody(body) {
  const maxB = maxContextSizeBytes();
  const s = String(body || '');
  if (s.length <= maxB) return { text: s, truncated: false };
  _oversizedContexts += 1;
  _pushEvent({ type: 'oversized', bytes: s.length, max: maxB });
  const cut = s.slice(0, Math.max(0, maxB - 80));
  return {
    text: `${cut}\n\n[CONTEXT_TRUNCATED_INTEGRITY_LAYER]`,
    truncated: true
  };
}

/**
 * @param {object} params
 * @param {object} params.contextBundle — { context, scope, permissions, integrity? }
 * @param {object|null} params.envelope — saída de buildContextIntegrityEnvelope
 * @param {object|null} params.identity — bindIdentity shape
 * @param {object} [params.metadata]
 */
function validateContextIntegrity({ contextBundle, envelope, identity, metadata }) {
  const reasons = [];
  const bundle = contextBundle && typeof contextBundle === 'object' ? contextBundle : {};
  const body = String(bundle.context != null ? bundle.context : '');
  const scope = bundle.scope && typeof bundle.scope === 'object' ? bundle.scope : {};
  const permissions = Array.isArray(bundle.permissions) ? bundle.permissions : [];
  const env = envelope && typeof envelope === 'object' ? envelope : null;

  if (!env || !env.context_hash) {
    reasons.push('missing_envelope');
    return { ok: false, reasons, tenant_scope: identity?.company_id || null };
  }

  const dataState = env.data_state != null ? String(env.data_state) : 'unknown';
  const canonical = stableSerialize({
    body,
    scope,
    permissions,
    company_id: env.company_id != null ? String(env.company_id).trim() : '',
    data_state: dataState
  });
  const recomputed = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  if (recomputed !== env.context_hash) {
    reasons.push('hash_mismatch');
  }

  const idC = identity && identity.company_id != null ? String(identity.company_id).trim() : '';
  const envC = env.company_id != null ? String(env.company_id).trim() : '';
  if (idC && envC && idC !== envC) {
    reasons.push('tenant_mismatch');
  }
  if (envC && idC && idC === envC) {
    /* ok */
  }

  if (metadata && typeof metadata === 'object') {
    const mk = countMetadataKeys(metadata);
    if (mk > maxMetadataFields() * 3) reasons.push('metadata_depth_explosion');
  }

  const cap = bundle.scope || {};
  const envScopeSet = new Set(Array.isArray(env.scope) ? env.scope : []);
  const scopeKeys = Object.keys(cap).sort();
  const rebuilt = new Set(
    scopeKeys.map((k) => `${k}:${cap[k] === true ? '1' : cap[k] === false ? '0' : String(cap[k])}`)
  );
  for (const t of rebuilt) {
    if (!envScopeSet.has(t)) reasons.push(`scope_drift:${t}`);
  }
  for (const t of envScopeSet) {
    if (!rebuilt.has(t)) reasons.push(`scope_stale:${t}`);
  }

  const poisonReasons = analyzePoisoningSignals({
    contextText: body,
    metadata: metadata || {},
    identity: identity || {}
  });
  if (poisonReasons.length) {
    _poisoningAttempts += 1;
    try {
      console.warn('[CONTEXT_POISONING]', JSON.stringify({ reasons: poisonReasons, company_id: identity?.company_id }));
    } catch (_e) {}
    _pushEvent({ type: 'poisoning', reasons: poisonReasons });
    reasons.push(...poisonReasons.map((r) => `poison:${r}`));
  }

  const leakReasons = analyzeCrossTenantSignals({ contextText: body, identity: identity || {} });
  if (leakReasons.length) {
    _crossTenantBlocks += 1;
    try {
      console.warn('[CONTEXT_CROSS_TENANT]', JSON.stringify({ reasons: leakReasons }));
    } catch (_e) {}
    _pushEvent({ type: 'cross_tenant', reasons: leakReasons });
    reasons.push(...leakReasons.map((r) => `leak:${r}`));
  }

  const ok = reasons.length === 0;
  if (!ok) {
    noteIntegrityFailure('validate:' + (reasons[0] || 'unknown'));
    try {
      console.warn(
        '[CONTEXT_INTEGRITY_FAIL]',
        JSON.stringify({ reasons, company_id: idC || envC || null })
      );
    } catch (_e) {}
  } else {
    _verifiedContexts += 1;
    try {
      console.info(
        '[CONTEXT_INTEGRITY]',
        JSON.stringify({
          ok: true,
          context_hash: env.context_hash.slice(0, 16) + '…',
          tenant_scope: envC || idC || 'unscoped'
        })
      );
      console.info(
        '[CONTEXT_SCOPE]',
        JSON.stringify({ scope: env.scope || [], data_state: dataState })
      );
    } catch (_e2) {}
  }

  return {
    ok,
    reasons,
    tenant_scope: envC || idC || null,
    context_hash: env.context_hash
  };
}

function attachIntegrityToBundle(bundle, { user, companyId, channel, data_state }) {
  if (!isContextIntegrityEnabled()) {
    return {
      ...bundle,
      integrity: { verified: false, skipped: true, reason: 'layer_disabled' }
    };
  }
  const cid = companyId != null ? String(companyId).trim() : user?.company_id != null ? String(user.company_id).trim() : '';
  const ch = channel != null ? String(channel).slice(0, 128) : 'secure_context';
  const ds = data_state != null ? String(data_state) : 'unknown';
  let body = String(bundle.context != null ? bundle.context : '');
  const trunc = truncateContextBody(body);
  body = trunc.text;
  const scope = bundle.scope && typeof bundle.scope === 'object' ? bundle.scope : {};
  const permissions = Array.isArray(bundle.permissions) ? bundle.permissions : [];
  const hashPack = generateContextHash({
    body,
    scope,
    permissions,
    company_id: cid,
    data_state: ds
  });
  const envelope = buildContextIntegrityEnvelope({
    context_hash: hashPack.context_hash,
    company_id: cid,
    channel: ch,
    data_state: ds,
    scope,
    timestamp: hashPack.generated_at
  });
  return {
    ...bundle,
    context: body,
    integrity: {
      context_hash: hashPack.context_hash,
      verified: true,
      envelope,
      truncated: trunc.truncated,
      generated_at: hashPack.generated_at,
      tenant_scope: hashPack.tenant_scope
    }
  };
}

function noteIntegrityFailure(reason) {
  _integrityFailures += 1;
  _pushEvent({ type: 'integrity_fail', reason: reason || 'unknown' });
}

function getDashboardMetrics() {
  const fail = _integrityFailures;
  const poison = _poisoningAttempts;
  const cross = _crossTenantBlocks;
  const over = _oversizedContexts;
  const verified = _verifiedContexts;
  let status = 'healthy';
  if (!isContextIntegrityEnabled()) status = 'disabled';
  else if (fail + poison + cross > 20) status = 'critical';
  else if (fail + poison + cross > 2) status = 'warning';
  return {
    enabled: isContextIntegrityEnabled(),
    block_mode: isBlockMode(),
    verified_contexts: verified,
    integrity_failures: fail,
    cross_tenant_blocks: cross,
    poisoning_attempts: poison,
    oversized_contexts: over,
    status
  };
}

function _num(name, def) {
  const n = Number(process.env[name] || def);
  return Number.isFinite(n) ? n : def;
}

/**
 * Readiness observável para IMPETUS_CONTEXT_INTEGRITY_BLOCK_MODE — não activa o modo automaticamente.
 */
function evaluateIntegrityBlockReadiness(opts = {}) {
  const silent = !!(opts && opts.silent_logs === true);
  const m = getDashboardMetrics();
  const verified = Math.max(0, m.verified_contexts);
  const denom = Math.max(_num('IMPETUS_INTEGRITY_ROLLOUT_MIN_DENOM', 100), verified);
  const oversized_rate = m.oversized_contexts / denom;
  const poison_rate = m.poisoning_attempts / denom;
  const cross_rate = m.cross_tenant_blocks / denom;
  const fail_rate = m.integrity_failures / denom;
  const poisonMax = _num('IMPETUS_INTEGRITY_ROLLOUT_POISON_MAX', 0.02);
  const crossMax = _num('IMPETUS_INTEGRITY_ROLLOUT_CROSS_MAX', 0.02);
  const oversizedMax = _num('IMPETUS_INTEGRITY_ROLLOUT_OVERSIZED_MAX', 0.01);
  const failMax = _num('IMPETUS_INTEGRITY_ROLLOUT_FAIL_MAX', 0.05);
  const minVerified = _num('IMPETUS_INTEGRITY_ROLLOUT_MIN_VERIFIED', 50);

  const oversizedOk = oversized_rate < oversizedMax;
  const poisonOk = poison_rate < poisonMax;
  const crossOk = cross_rate < crossMax;
  const failStable = fail_rate < failMax;
  const sampleOk = m.enabled && verified >= minVerified;
  const block_mode_ready = !!(sampleOk && oversizedOk && poisonOk && crossOk && failStable);

  const false_positive_rate = Math.min(1, poison_rate + cross_rate);
  const observed_days = Math.min(365, Math.max(1, _num('IMPETUS_INTEGRITY_ROLLOUT_OBSERVED_DAYS', 14)));
  let confidence = 0;
  if (m.enabled && verified > 0) {
    const penalty =
      oversized_rate * 400 +
      poison_rate * 350 +
      cross_rate * 350 +
      fail_rate * 200;
    confidence = Math.round(Math.max(0, Math.min(100, 100 - penalty)));
  }

  const out = {
    block_mode_ready,
    confidence,
    observed_days,
    false_positive_rate: Math.round(false_positive_rate * 10000) / 10000,
    checks: {
      oversized_rate: Math.round(oversized_rate * 10000) / 10000,
      poison_rate: Math.round(poison_rate * 10000) / 10000,
      cross_tenant_rate: Math.round(cross_rate * 10000) / 10000,
      integrity_fail_rate: Math.round(fail_rate * 10000) / 10000,
      min_verified_met: verified >= minVerified
    }
  };

  if (!silent) {
    try {
      if (block_mode_ready) {
        console.info('[INTEGRITY_ROLLOUT_READY]', JSON.stringify({ confidence, false_positive_rate: out.false_positive_rate }));
      } else {
        console.info(
          '[INTEGRITY_ROLLOUT_NOT_READY]',
          JSON.stringify({
            enabled: m.enabled,
            verified,
            checks: out.checks
          })
        );
      }
    } catch (_e) {}
  }

  return out;
}

function getRecentIntegrityEvents(limit = 30) {
  const n = Math.min(MAX_EVENTS, Math.max(1, limit || 30));
  return _recentEvents.slice(-n).reverse();
}

function getAdminContextIntegrityPayload() {
  return {
    ok: true,
    engine: {
      enabled: isContextIntegrityEnabled(),
      block_mode: isBlockMode(),
      integrity_version: INTEGRITY_VERSION,
      limits: {
        max_context_bytes: maxContextSizeBytes(),
        max_metadata_fields: maxMetadataFields(),
        max_context_depth: maxContextDepth()
      }
    },
    metrics: getDashboardMetrics(),
    recent_events: getRecentIntegrityEvents(40)
  };
}

/** Testes / diagnóstico */
function _resetCounters() {
  _verifiedContexts = 0;
  _integrityFailures = 0;
  _poisoningAttempts = 0;
  _crossTenantBlocks = 0;
  _oversizedContexts = 0;
  _recentEvents.length = 0;
  _flowByTrace.clear();
}

module.exports = {
  INTEGRITY_VERSION,
  isContextIntegrityEnabled,
  isBlockMode,
  generateContextHash,
  buildContextIntegrityEnvelope,
  validateContextIntegrity,
  detectContextPoisoning,
  detectCrossTenantLeakage,
  truncateContextBody,
  attachIntegrityToBundle,
  recordIntegrityFlowTrace,
  consumeIntegrityFlowTrace,
  getDashboardMetrics,
  evaluateIntegrityBlockReadiness,
  getRecentIntegrityEvents,
  getAdminContextIntegrityPayload,
  noteIntegrityFailure,
  analyzePoisoningSignals,
  analyzeCrossTenantSignals,
  _resetCounters
};
