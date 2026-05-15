'use strict';

/**
 * IMPETUS — Cognitive Simulation Engine (Fase 10)
 * QA cognitivo: before vs after, temporal replay, governance regression analysis.
 *
 * Integra: cognitiveReplayService, cognitivePolicyGovernanceDiffService.
 *
 * Feature flag: IMPETUS_COGNITIVE_SIMULATION_ENABLED (default: false)
 */

const { v4: uuidv4 } = require('uuid');

const SIMULATION_ENABLED =
  String(process.env.IMPETUS_COGNITIVE_SIMULATION_ENABLED || 'false').trim().toLowerCase() === 'true';

const COMPARISON_VERDICTS = Object.freeze({
  IMPROVED: 'improved',
  REGRESSED: 'regressed',
  STABLE: 'stable',
  INCONCLUSIVE: 'inconclusive'
});

const _simulations = [];
const _replays = [];
const _regressionReports = [];
const MAX_SIMULATIONS = 2000;
const MAX_REPLAYS = 3000;
const MAX_REGRESSION_REPORTS = 200;

let _simulationsRun = 0;
let _replaysExecuted = 0;
let _regressionsDetected = 0;

/**
 * Before vs After Runtime (Fase 10.1)
 * Compara resposta de dois pipelines/configurações para o mesmo input.
 */
function runComparison(input, responseA, responseB, context = {}) {
  const comparison = {
    simulation_id: uuidv4(),
    input_summary: typeof input === 'string' ? input.slice(0, 500) : JSON.stringify(input).slice(0, 500),
    response_a: {
      source: context.source_a || 'before',
      quality_score: responseA.quality_score != null ? responseA.quality_score : null,
      latency_ms: responseA.latency_ms || null,
      confidence: responseA.confidence || null,
      token_count: responseA.token_count || null,
      content_hash: _simpleHash(responseA.content || ''),
      content_preview: String(responseA.content || '').slice(0, 200)
    },
    response_b: {
      source: context.source_b || 'after',
      quality_score: responseB.quality_score != null ? responseB.quality_score : null,
      latency_ms: responseB.latency_ms || null,
      confidence: responseB.confidence || null,
      token_count: responseB.token_count || null,
      content_hash: _simpleHash(responseB.content || ''),
      content_preview: String(responseB.content || '').slice(0, 200)
    },
    verdict: null,
    delta: {},
    compared_at: new Date().toISOString(),
    metadata: _safeClone(context.metadata || {})
  };

  const qualA = comparison.response_a.quality_score;
  const qualB = comparison.response_b.quality_score;

  if (qualA != null && qualB != null) {
    const delta = qualB - qualA;
    comparison.delta.quality = Math.round(delta * 10000) / 10000;

    if (delta > 0.05) comparison.verdict = COMPARISON_VERDICTS.IMPROVED;
    else if (delta < -0.05) comparison.verdict = COMPARISON_VERDICTS.REGRESSED;
    else comparison.verdict = COMPARISON_VERDICTS.STABLE;
  } else {
    comparison.verdict = COMPARISON_VERDICTS.INCONCLUSIVE;
  }

  if (comparison.response_a.latency_ms && comparison.response_b.latency_ms) {
    comparison.delta.latency_ms = comparison.response_b.latency_ms - comparison.response_a.latency_ms;
  }

  if (comparison.response_a.confidence && comparison.response_b.confidence) {
    comparison.delta.confidence = Math.round((comparison.response_b.confidence - comparison.response_a.confidence) * 10000) / 10000;
  }

  comparison.delta.content_changed = comparison.response_a.content_hash !== comparison.response_b.content_hash;

  _simulations.push(comparison);
  if (_simulations.length > MAX_SIMULATIONS) _simulations.splice(0, _simulations.length - MAX_SIMULATIONS);
  _simulationsRun++;

  return comparison;
}

/**
 * Temporal Replay (Fase 10.2)
 * Armazena contexto para reexecução futura.
 */
function captureReplayPoint(context = {}) {
  const replay = {
    replay_id: uuidv4(),
    prompt: context.prompt || null,
    system_context: _safeClone(context.system_context || {}),
    user_context: _safeClone(context.user_context || {}),
    model: context.model || null,
    pipeline_config: _safeClone(context.pipeline_config || {}),
    original_response: context.original_response ? {
      content_preview: String(context.original_response.content || '').slice(0, 500),
      quality_score: context.original_response.quality_score || null,
      latency_ms: context.original_response.latency_ms || null,
      confidence: context.original_response.confidence || null
    } : null,
    captured_at: new Date().toISOString(),
    replayed: false,
    replay_results: []
  };

  _replays.push(replay);
  if (_replays.length > MAX_REPLAYS) _replays.splice(0, _replays.length - MAX_REPLAYS);

  return { replay_id: replay.replay_id };
}

function recordReplayResult(replayId, result = {}) {
  const replay = _replays.find(r => r.replay_id === replayId);
  if (!replay) return { found: false };

  replay.replayed = true;
  replay.replay_results.push({
    result_id: uuidv4(),
    content_preview: String(result.content || '').slice(0, 500),
    quality_score: result.quality_score || null,
    latency_ms: result.latency_ms || null,
    confidence: result.confidence || null,
    model: result.model || null,
    replayed_at: new Date().toISOString()
  });

  _replaysExecuted++;
  return { found: true, replay_id: replayId, results_count: replay.replay_results.length };
}

/**
 * Governance Regression Analysis (Fase 10.3)
 * Analisa batch de simulações para detectar regressão sistémica.
 */
function analyzeRegression(opts = {}) {
  const window = opts.window || 100;
  const recentSims = _simulations.slice(-window);

  if (recentSims.length < 5) {
    return { verdict: COMPARISON_VERDICTS.INCONCLUSIVE, reason: 'insufficient_data', sample_size: recentSims.length };
  }

  const verdicts = {
    improved: recentSims.filter(s => s.verdict === COMPARISON_VERDICTS.IMPROVED).length,
    regressed: recentSims.filter(s => s.verdict === COMPARISON_VERDICTS.REGRESSED).length,
    stable: recentSims.filter(s => s.verdict === COMPARISON_VERDICTS.STABLE).length,
    inconclusive: recentSims.filter(s => s.verdict === COMPARISON_VERDICTS.INCONCLUSIVE).length
  };

  const total = recentSims.length;
  const regressionRate = verdicts.regressed / total;
  const improvementRate = verdicts.improved / total;

  let overallVerdict;
  if (regressionRate > 0.3) {
    overallVerdict = COMPARISON_VERDICTS.REGRESSED;
    _regressionsDetected++;
  } else if (improvementRate > 0.3) {
    overallVerdict = COMPARISON_VERDICTS.IMPROVED;
  } else {
    overallVerdict = COMPARISON_VERDICTS.STABLE;
  }

  const qualityDeltas = recentSims.filter(s => s.delta && s.delta.quality != null).map(s => s.delta.quality);
  const avgQualityDelta = qualityDeltas.length
    ? Math.round(qualityDeltas.reduce((s, v) => s + v, 0) / qualityDeltas.length * 10000) / 10000
    : null;

  const report = {
    report_id: uuidv4(),
    overall_verdict: overallVerdict,
    sample_size: total,
    verdicts,
    regression_rate: Math.round(regressionRate * 10000) / 100,
    improvement_rate: Math.round(improvementRate * 10000) / 100,
    avg_quality_delta: avgQualityDelta,
    analyzed_at: new Date().toISOString()
  };

  _regressionReports.push(report);
  if (_regressionReports.length > MAX_REGRESSION_REPORTS) {
    _regressionReports.splice(0, _regressionReports.length - MAX_REGRESSION_REPORTS);
  }

  return report;
}

function getRecentSimulations(limit = 50) {
  return _simulations.slice(-Math.min(limit, 500));
}

function getReplayPoints(limit = 50) {
  return _replays.slice(-Math.min(limit, 500)).map(r => ({
    replay_id: r.replay_id,
    model: r.model,
    captured_at: r.captured_at,
    replayed: r.replayed,
    results_count: r.replay_results.length
  }));
}

function getRegressionReports(limit = 20) {
  return _regressionReports.slice(-Math.min(limit, 100));
}

function getMetrics() {
  return {
    simulations_run: _simulationsRun,
    replays_executed: _replaysExecuted,
    regressions_detected: _regressionsDetected,
    replay_points_stored: _replays.length,
    simulation_enabled: SIMULATION_ENABLED
  };
}

function getHealth() {
  return {
    status: !SIMULATION_ENABLED ? 'disabled' : 'healthy',
    metrics: getMetrics(),
    latest_regression: _regressionReports.length > 0 ? _regressionReports[_regressionReports.length - 1] : null
  };
}

function _simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return hash.toString(16);
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

module.exports = {
  COMPARISON_VERDICTS,
  SIMULATION_ENABLED,
  runComparison,
  captureReplayPoint,
  recordReplayResult,
  analyzeRegression,
  getRecentSimulations,
  getReplayPoints,
  getRegressionReports,
  getMetrics,
  getHealth
};
