'use strict';

/**
 * IMPETUS — AI Benchmark Service (Fase 9)
 * Comparação contínua entre modelos: GPT, Claude, Gemini.
 * Scoring persistente, seleção ponderada por tarefa/domínio.
 *
 * Feature flag: IMPETUS_AI_BENCHMARK_ENABLED (default: false)
 */

const { v4: uuidv4 } = require('uuid');

const BENCHMARK_ENABLED =
  String(process.env.IMPETUS_AI_BENCHMARK_ENABLED || 'false').trim().toLowerCase() === 'true';

const MODELS = Object.freeze({
  GPT: 'gpt',
  CLAUDE: 'claude',
  GEMINI: 'gemini'
});

const EVALUATION_DIMENSIONS = Object.freeze({
  LATENCY: 'latency',
  QUALITY: 'quality',
  DIVERGENCE: 'divergence',
  HALLUCINATION: 'hallucination',
  STABILITY: 'stability',
  COST: 'cost'
});

const TASK_TYPES = Object.freeze({
  SUMMARY: 'summary',
  CLASSIFICATION: 'classification',
  EXTRACTION: 'extraction',
  GENERATION: 'generation',
  ANALYSIS: 'analysis',
  CONVERSATION: 'conversation'
});

const _modelScores = new Map();
const _benchmarkRuns = [];
const _taskScores = new Map();
const MAX_RUNS = 5000;

let _runsTotal = 0;
let _comparisonsTotal = 0;

function _initScores() {
  for (const model of Object.values(MODELS)) {
    _modelScores.set(model, {
      model,
      latency_avg_ms: 0,
      quality_avg: 0,
      divergence_avg: 0,
      hallucination_rate: 0,
      stability_score: 0.8,
      cost_per_1k_tokens: 0,
      samples: 0,
      last_updated: null
    });
  }
}
_initScores();

/**
 * Regista resultado de um benchmark run.
 */
function recordRun(model, taskType, result = {}) {
  if (!BENCHMARK_ENABLED && !result.force) return { recorded: false, reason: 'benchmark_disabled' };

  const validModel = Object.values(MODELS).includes(model) ? model : 'unknown';
  const validTask = Object.values(TASK_TYPES).includes(taskType) ? taskType : 'unknown';

  const run = {
    run_id: uuidv4(),
    model: validModel,
    task_type: validTask,
    latency_ms: result.latency_ms || null,
    quality_score: result.quality_score != null ? Math.min(1, Math.max(0, result.quality_score)) : null,
    divergence_score: result.divergence_score != null ? result.divergence_score : null,
    hallucination_detected: result.hallucination_detected || false,
    token_count: result.token_count || null,
    cost_estimate: result.cost_estimate || null,
    metadata: _safeClone(result.metadata || {}),
    recorded_at: new Date().toISOString()
  };

  _benchmarkRuns.push(run);
  if (_benchmarkRuns.length > MAX_RUNS) _benchmarkRuns.splice(0, _benchmarkRuns.length - MAX_RUNS);
  _runsTotal++;

  _updateModelScore(validModel, run);
  _updateTaskScore(validModel, validTask, run);

  return { recorded: true, run_id: run.run_id };
}

function _updateModelScore(model, run) {
  const score = _modelScores.get(model);
  if (!score) return;

  const alpha = 0.1;
  score.samples++;

  if (run.latency_ms != null) {
    score.latency_avg_ms = score.latency_avg_ms * (1 - alpha) + run.latency_ms * alpha;
  }
  if (run.quality_score != null) {
    score.quality_avg = score.quality_avg * (1 - alpha) + run.quality_score * alpha;
  }
  if (run.divergence_score != null) {
    score.divergence_avg = score.divergence_avg * (1 - alpha) + run.divergence_score * alpha;
  }
  if (run.hallucination_detected) {
    score.hallucination_rate = score.hallucination_rate * 0.95 + 0.05;
  } else {
    score.hallucination_rate = score.hallucination_rate * 0.95;
  }
  if (run.cost_estimate != null && run.token_count > 0) {
    score.cost_per_1k_tokens = (run.cost_estimate / run.token_count) * 1000;
  }

  const recentRuns = _benchmarkRuns.filter(r => r.model === model).slice(-50);
  if (recentRuns.length >= 10) {
    const qualityScores = recentRuns.filter(r => r.quality_score != null).map(r => r.quality_score);
    if (qualityScores.length >= 5) {
      const mean = qualityScores.reduce((s, v) => s + v, 0) / qualityScores.length;
      const variance = qualityScores.reduce((s, v) => s + (v - mean) ** 2, 0) / qualityScores.length;
      score.stability_score = Math.max(0, 1 - Math.sqrt(variance));
    }
  }

  score.last_updated = new Date().toISOString();
}

function _updateTaskScore(model, taskType, run) {
  const key = `${model}:${taskType}`;
  const existing = _taskScores.get(key) || {
    model, task_type: taskType, quality_avg: 0, latency_avg_ms: 0, samples: 0
  };

  const alpha = 0.15;
  if (run.quality_score != null) {
    existing.quality_avg = existing.quality_avg * (1 - alpha) + run.quality_score * alpha;
  }
  if (run.latency_ms != null) {
    existing.latency_avg_ms = existing.latency_avg_ms * (1 - alpha) + run.latency_ms * alpha;
  }
  existing.samples++;
  existing.last_updated = new Date().toISOString();

  _taskScores.set(key, existing);
}

/**
 * Comparação entre modelos — ranking global.
 */
function compareModels() {
  _comparisonsTotal++;

  const models = Array.from(_modelScores.values())
    .filter(s => s.samples > 0)
    .map(s => ({
      model: s.model,
      composite_score: _compositeScore(s),
      quality: Math.round(s.quality_avg * 100) / 100,
      latency_ms: Math.round(s.latency_avg_ms),
      hallucination_rate: Math.round(s.hallucination_rate * 10000) / 100,
      stability: Math.round(s.stability_score * 100) / 100,
      divergence: Math.round(s.divergence_avg * 100) / 100,
      cost_per_1k: Math.round(s.cost_per_1k_tokens * 10000) / 10000,
      samples: s.samples,
      last_updated: s.last_updated
    }));

  models.sort((a, b) => b.composite_score - a.composite_score);

  return {
    ranking: models,
    best_overall: models[0] || null,
    compared_at: new Date().toISOString()
  };
}

function _compositeScore(score) {
  return Math.round(
    (score.quality_avg * 35
    + score.stability_score * 25
    + (1 - score.hallucination_rate) * 20
    + (1 - Math.min(score.divergence_avg, 1)) * 10
    + Math.max(0, 1 - score.latency_avg_ms / 10000) * 10) * 100
  ) / 100;
}

/**
 * Weighted Runtime Selection (Fase 9.3)
 * Escolhe o melhor modelo para um tipo de tarefa específico.
 */
function selectBestForTask(taskType) {
  const candidates = [];
  for (const model of Object.values(MODELS)) {
    const key = `${model}:${taskType}`;
    const score = _taskScores.get(key);
    if (score && score.samples >= 3) {
      candidates.push(score);
    }
  }

  if (!candidates.length) {
    const global = compareModels();
    return {
      selected: global.best_overall ? global.best_overall.model : MODELS.GPT,
      reason: 'no_task_specific_data',
      task_type: taskType,
      fallback: true
    };
  }

  candidates.sort((a, b) => b.quality_avg - a.quality_avg);
  return {
    selected: candidates[0].model,
    reason: 'task_specific_best',
    task_type: taskType,
    quality: candidates[0].quality_avg,
    samples: candidates[0].samples,
    alternatives: candidates.slice(1).map(c => ({ model: c.model, quality: c.quality_avg })),
    fallback: false
  };
}

function getRecentRuns(model, limit = 50) {
  let filtered = _benchmarkRuns;
  if (model) filtered = filtered.filter(r => r.model === model);
  return filtered.slice(-Math.min(limit, 500));
}

function getMetrics() {
  return {
    runs_total: _runsTotal,
    comparisons_total: _comparisonsTotal,
    models_tracked: _modelScores.size,
    task_combinations: _taskScores.size,
    benchmark_enabled: BENCHMARK_ENABLED
  };
}

function getHealth() {
  return {
    status: !BENCHMARK_ENABLED ? 'disabled' : 'healthy',
    metrics: getMetrics(),
    model_summary: Array.from(_modelScores.values()).map(s => ({
      model: s.model, samples: s.samples, quality: Math.round(s.quality_avg * 100) / 100
    }))
  };
}

function _safeClone(obj) {
  try { return JSON.parse(JSON.stringify(obj)); }
  catch { return {}; }
}

module.exports = {
  MODELS,
  EVALUATION_DIMENSIONS,
  TASK_TYPES,
  BENCHMARK_ENABLED,
  recordRun,
  compareModels,
  selectBestForTask,
  getRecentRuns,
  getMetrics,
  getHealth
};
