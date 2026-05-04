'use strict';

/**
 * Latência por fornecedor + tendência (primeira vs segunda metade da janela)
 * e limiar progressivo / early warning antes da falha total.
 */

const RING = 24;
const buffers = {
  gemini: /** @type {number[]} */ ([]),
  claude: /** @type {number[]} */ ([]),
  openai: /** @type {number[]} */ ([])
};

/** Acertos consecutivos acima do limiar (sustentação antes de LIMITED). */
const _sustainCount = { gemini: 0, claude: 0, openai: 0 };
function _push(ring, ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0 || n > 600000) return;
  ring.push(n);
  if (ring.length > RING) ring.splice(0, ring.length - RING);
}

function _avg(ring) {
  if (!ring.length) return 0;
  let s = 0;
  for (const x of ring) s += x;
  return s / ring.length;
}

/**
 * Compara média da primeira metade vs segunda metade dos últimos L valores (tendência).
 */
function _trendSlope(ring) {
  const L = ring.length;
  if (L < 8) return 0;
  const half = Math.floor(L / 2);
  let a = 0;
  let b = 0;
  for (let i = 0; i < half; i++) a += ring[i];
  for (let i = half; i < L; i++) b += ring[i];
  return b / (L - half) - a / half;
}

function getConfig() {
  const minSamples = Math.max(
    3,
    Math.min(20, parseInt(process.env.IMPETUS_LATENCY_MIN_SAMPLES || '6', 10) || 6)
  );
  const threshold = Math.max(
    3000,
    parseInt(process.env.IMPETUS_LATENCY_LIMITED_THRESHOLD_MS || '14000', 10) || 14000
  );
  const earlyRatio = Math.max(
    0.45,
    Math.min(0.95, parseFloat(process.env.IMPETUS_LATENCY_EARLY_WARNING_RATIO || '0.72') || 0.72)
  );
  const sustainNeeded = Math.max(
    1,
    Math.min(8, parseInt(process.env.IMPETUS_LATENCY_SUSTAIN_TICKS || '3', 10) || 3)
  );
  return { minSamples, threshold, earlyRatio, sustainNeeded, earlyThreshold: threshold * earlyRatio };
}

let _lastEval = 0;

function tryEvaluateLatencyLimited() {
  const now = Date.now();
  if (now - _lastEval < 2000) return;
  _lastEval = now;
  const { minSamples, threshold, earlyThreshold, sustainNeeded } = getConfig();
  let srs;
  try {
    srs = require('./systemRuntimeState');
  } catch (_e) {
    return;
  }
  if (srs.isDegraded()) return;

  for (const key of ['gemini', 'claude', 'openai']) {
    const ring = buffers[key];
    if (ring.length < minSamples) continue;
    const avg = _avg(ring);
    const slope = _trendSlope(ring);

    if (avg > threshold) {
      _sustainCount[key] += 1;
      if (_sustainCount[key] >= sustainNeeded) {
        srs.setLimited('AI_LATENCY_HIGH', `${key}:avg_ms=${Math.round(avg)}:sustained=${_sustainCount[key]}`, {
          force: true
        });
        _sustainCount[key] = 0;
        return;
      }
    } else {
      _sustainCount[key] = 0;
    }

    // Só stress predictivo (antes do LIMITED por média sustentada): tendência + zona alta
    if (avg >= earlyThreshold && avg < threshold && slope > 50 && srs.isHealthy()) {
      srs.applyStabilityMildStress();
      try {
        const resilienceMetrics = require('./resilienceMetricsService');
        resilienceMetrics.recordLimitedTrigger('LATENCY_TREND_WARN');
      } catch (_e) {
        /* ignore */
      }
      console.warn(
        '[LATENCY_PREDICTIVE]',
        JSON.stringify({ provider: key, avg_ms: Math.round(avg), slope: Math.round(slope) })
      );
    }
  }
}

function recordLatency(provider, durationMs) {
  const p = String(provider || '').toLowerCase();
  if (p === 'gemini') _push(buffers.gemini, durationMs);
  else if (p === 'claude') _push(buffers.claude, durationMs);
  else if (p === 'openai' || p === 'chatgpt') _push(buffers.openai, durationMs);
  tryEvaluateLatencyLimited();
}

function getSnapshot() {
  const { minSamples, threshold, earlyRatio, sustainNeeded } = getConfig();
  const earlyThreshold = threshold * earlyRatio;
  const snap = {
    gemini_avg_ms: Math.round(_avg(buffers.gemini)),
    claude_avg_ms: Math.round(_avg(buffers.claude)),
    openai_avg_ms: Math.round(_avg(buffers.openai)),
    gemini_slope: Math.round(_trendSlope(buffers.gemini)),
    claude_slope: Math.round(_trendSlope(buffers.claude)),
    openai_slope: Math.round(_trendSlope(buffers.openai)),
    samples: {
      gemini: buffers.gemini.length,
      claude: buffers.claude.length,
      openai: buffers.openai.length
    },
    threshold_ms: threshold,
    early_warning_threshold_ms: Math.round(earlyThreshold),
    min_samples: minSamples,
    sustain_ticks_required: sustainNeeded,
    sustain_progress: { ..._sustainCount }
  };
  return snap;
}

function resetRing(provider) {
  const p = String(provider || '').toLowerCase();
  if (p === 'gemini') buffers.gemini.length = 0;
  else if (p === 'claude') buffers.claude.length = 0;
  else if (p === 'openai') buffers.openai.length = 0;
}

module.exports = {
  recordLatency,
  getSnapshot,
  tryEvaluateLatencyLimited,
  resetRing
};
