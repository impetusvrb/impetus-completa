'use strict';

/**
 * Circuit breaker por provider (Claude, GPT/OpenAI, Gemini).
 * Janela deslizante, taxa de falha, OPEN → cooldown → HALF_OPEN (probes) → CLOSED.
 * Não substitui circuitos locais em ai.js / claudeService — complementa e alimenta fallback global.
 */

const PROVIDERS = Object.freeze(['claude', 'gpt', 'gemini']);

function _emit(event, provider, fields = {}) {
  try {
    require('./resilienceStructuredLog').resilienceLog(event, {
      provider,
      tier: 'circuit',
      ...fields
    });
  } catch (_e) {
    /* ignore — fallback textual legacy */
  }
}

/** @typedef {'CLOSED'|'OPEN'|'HALF_OPEN'} CbState */

function cfg() {
  return {
    windowMs: Math.max(30000, parseInt(process.env.IMPETUS_CB_WINDOW_MS || '120000', 10) || 120000),
    failureRateOpen: Math.min(
      0.95,
      Math.max(0.05, parseFloat(process.env.IMPETUS_CB_FAILURE_RATE_OPEN || '0.45') || 0.45)
    ),
    minSamples: Math.max(4, parseInt(process.env.IMPETUS_CB_MIN_SAMPLES || '8', 10) || 8),
    cooldownMs: Math.max(5000, parseInt(process.env.IMPETUS_CB_COOLDOWN_MS || '30000', 10) || 30000),
    halfOpenProbes: Math.max(1, parseInt(process.env.IMPETUS_CB_HALF_OPEN_PROBES || '2', 10) || 2),
    disabled: String(process.env.IMPETUS_CB_DISABLED || '').toLowerCase() === 'true'
  };
}

/** @type {Record<string, { events: { t: number, ok: boolean }[], state: CbState, openedAt: number, probeSlots: number }>} */
const _buckets = {};

function _bucket(name) {
  const k = String(name || '').toLowerCase();
  if (!_buckets[k]) {
    _buckets[k] = {
      events: [],
      state: 'CLOSED',
      openedAt: 0,
      probeSlots: 0
    };
  }
  return _buckets[k];
}

function _prune(b) {
  const w = cfg().windowMs;
  const now = Date.now();
  b.events = b.events.filter((e) => now - e.t <= w);
}

function _maybeOpenFromWindow(provider, b) {
  const c = cfg();
  _prune(b);
  const n = b.events.length;
  if (n < c.minSamples) return;
  const fails = b.events.filter((e) => !e.ok).length;
  const rate = fails / n;
  if (rate >= c.failureRateOpen) {
    b.state = 'OPEN';
    b.openedAt = Date.now();
    _emit('circuit_breaker_open', provider, {
      fallback_level: 'OPEN',
      detail: `failure_rate=${rate.toFixed(3)} samples=${n}`
    });
    console.warn(
      `[CIRCUIT_BREAKER] OPEN provider=${provider} failure_rate=${rate.toFixed(3)} samples=${n}`
    );
  }
}

/**
 * Antes da chamada HTTP: em HALF_OPEN consome um slot de probe.
 * @param {string} provider
 */
function beginCall(provider) {
  if (cfg().disabled) return;
  const b = _bucket(provider);
  if (b.state === 'HALF_OPEN' && b.probeSlots > 0) {
    b.probeSlots -= 1;
  }
}

/**
 * Se true, não invocar o provider (fallback deve saltar este elo).
 * @param {string} provider — claude | gpt | gemini
 */
function shouldSkip(provider) {
  if (cfg().disabled) return false;
  const b = _bucket(provider);
  const c = cfg();
  const now = Date.now();

  if (b.state === 'OPEN') {
    if (now - b.openedAt >= c.cooldownMs) {
      b.state = 'HALF_OPEN';
      b.probeSlots = c.halfOpenProbes;
      _emit('circuit_breaker_half_open', provider, {
        fallback_level: 'HALF_OPEN',
        detail: `probes=${b.probeSlots}`
      });
      console.warn(`[CIRCUIT_BREAKER] HALF_OPEN provider=${provider} probes=${b.probeSlots}`);
    } else {
      return true;
    }
  }

  if (b.state === 'HALF_OPEN' && b.probeSlots <= 0) {
    return true;
  }

  return false;
}

/**
 * @param {string} provider
 * @param {boolean} ok — sucesso real da API (não bloqueio de carteira / config em falta)
 */
function recordOutcome(provider, ok) {
  if (cfg().disabled) return;
  const b = _bucket(provider);
  const isOk = !!ok;

  if (b.state === 'HALF_OPEN') {
    if (isOk) {
      b.state = 'CLOSED';
      b.events = [];
      _emit('circuit_breaker_closed', provider, {
        fallback_level: 'CLOSED',
        detail: 'probe_ok'
      });
      console.warn(`[CIRCUIT_BREAKER] CLOSED provider=${provider} (probe_ok)`);
    } else {
      b.state = 'OPEN';
      b.openedAt = Date.now();
      _emit('circuit_breaker_open', provider, {
        fallback_level: 'OPEN',
        detail: 'probe_fail'
      });
      console.warn(`[CIRCUIT_BREAKER] OPEN provider=${provider} (probe_fail)`);
    }
    return;
  }

  _prune(b);
  b.events.push({ t: Date.now(), ok: isOk });

  if (b.state === 'CLOSED') {
    _maybeOpenFromWindow(provider, b);
  }
}

function getSnapshot() {
  const c = cfg();
  const out = {
    disabled: c.disabled,
    config: {
      window_ms: c.windowMs,
      failure_rate_open: c.failureRateOpen,
      min_samples: c.minSamples,
      cooldown_ms: c.cooldownMs,
      half_open_probes: c.halfOpenProbes
    },
    providers: {}
  };
  for (const p of PROVIDERS) {
    const b = _bucket(p);
    _prune(b);
    const n = b.events.length;
    const fails = b.events.filter((e) => !e.ok).length;
    out.providers[p] = {
      state: b.state,
      window_samples: n,
      window_failure_rate: n ? Math.round((fails / n) * 1000) / 1000 : 0,
      probe_slots_remaining: b.probeSlots,
      opened_at: b.openedAt || null
    };
  }
  return out;
}

module.exports = {
  PROVIDERS,
  shouldSkip,
  beginCall,
  recordOutcome,
  getSnapshot
};
