'use strict';

/**
 * ContextualModuleTelemetry (Phase 6, Part 9)
 * -------------------------------------------
 * Buffer em memória para resoluções e usos de módulos contextuais.
 * Não toca em DB. Idempotente. Estável sob alta carga (capped buffer).
 *
 *   recordResolution({user_id, area, function_type, mode, allowed_module_ids,
 *                     denied, validator, latency_ms, fallback})
 *   recordUsage({user_id, module_id, action, ts})
 *   summary({since})         - agregado para painel admin
 *   reset()                  - usado por testes
 */

const RESOLUTIONS = [];
const USAGE = [];
const MAX = 2000;

function _push(buf, item) {
  buf.push(item);
  if (buf.length > MAX) buf.splice(0, buf.length - MAX);
}

function recordResolution(entry) {
  if (!entry || typeof entry !== 'object') return;
  _push(RESOLUTIONS, {
    ts: Date.now(),
    user_id: entry.user_id ?? null,
    company_id: entry.company_id ?? null,
    area: entry.area || null,
    function_type: entry.function_type || null,
    mode: entry.mode || null,
    legacy_count: entry.legacy_count ?? null,
    contextual_count: entry.contextual_count ?? null,
    allowed_module_ids: Array.isArray(entry.allowed_module_ids) ? entry.allowed_module_ids.slice() : [],
    denied_count: Array.isArray(entry.denied) ? entry.denied.length : 0,
    validator: entry.validator || null,
    latency_ms: Number.isFinite(entry.latency_ms) ? entry.latency_ms : null,
    fallback: entry.fallback === true,
    overloaded: entry.overloaded === true,
    diff: entry.diff || null
  });
}

function recordUsage(entry) {
  if (!entry || !entry.module_id) return;
  _push(USAGE, {
    ts: entry.ts || Date.now(),
    user_id: entry.user_id ?? null,
    module_id: String(entry.module_id),
    action: String(entry.action || 'view'),
    duration_ms: Number.isFinite(entry.duration_ms) ? entry.duration_ms : null
  });
}

function summary(opts) {
  const since = opts && Number.isFinite(opts.since) ? opts.since : 0;
  const res = RESOLUTIONS.filter((r) => r.ts >= since);
  const use = USAGE.filter((u) => u.ts >= since);

  const modeBreakdown = res.reduce((acc, r) => {
    const k = r.mode || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const fallbackRate = res.length === 0 ? 0 : res.filter((r) => r.fallback).length / res.length;
  const overloadRate = res.length === 0 ? 0 : res.filter((r) => r.overloaded).length / res.length;
  const trustScores = res.map((r) => r.validator?.trust_score).filter((v) => Number.isFinite(v));
  const avgTrust = trustScores.length === 0 ? null : trustScores.reduce((a, b) => a + b, 0) / trustScores.length;

  // módulos mais entregues e mais usados
  const deliveredCount = {};
  for (const r of res) for (const id of r.allowed_module_ids) deliveredCount[id] = (deliveredCount[id] || 0) + 1;
  const usageCount = {};
  for (const u of use) usageCount[u.module_id] = (usageCount[u.module_id] || 0) + 1;

  // gaps: entregues e nunca usados
  const gaps = [];
  for (const id of Object.keys(deliveredCount)) {
    if (!usageCount[id]) {
      gaps.push({ module_id: id, delivered: deliveredCount[id], used: 0 });
    }
  }

  // most accessed by function
  const accessByFn = {};
  for (const r of res) {
    const fn = r.function_type || 'unknown';
    accessByFn[fn] = accessByFn[fn] || {};
    for (const id of r.allowed_module_ids) accessByFn[fn][id] = (accessByFn[fn][id] || 0) + 1;
  }

  // promotion confidence: ratio com validator.valid===true
  const validRes = res.filter((r) => r.validator && r.validator.valid === true).length;
  const promotionConfidence = res.length === 0 ? null : validRes / res.length;

  return {
    window: { since, count_resolutions: res.length, count_usage: use.length },
    mode_breakdown: modeBreakdown,
    fallback_rate: Number(fallbackRate.toFixed(3)),
    overload_rate: Number(overloadRate.toFixed(3)),
    avg_trust_score: avgTrust === null ? null : Number(avgTrust.toFixed(3)),
    promotion_confidence: promotionConfidence === null ? null : Number(promotionConfidence.toFixed(3)),
    delivered_count: deliveredCount,
    usage_count: usageCount,
    gaps,
    access_by_function: accessByFn
  };
}

function getResolutionsRecent(limit) {
  const n = Math.max(1, Math.min(MAX, Number.isFinite(limit) ? Math.round(limit) : 100));
  return RESOLUTIONS.slice(-n);
}

function getUsageRecent(limit) {
  const n = Math.max(1, Math.min(MAX, Number.isFinite(limit) ? Math.round(limit) : 100));
  return USAGE.slice(-n);
}

function reset() {
  RESOLUTIONS.length = 0;
  USAGE.length = 0;
}

module.exports = {
  recordResolution,
  recordUsage,
  summary,
  getResolutionsRecent,
  getUsageRecent,
  reset
};
