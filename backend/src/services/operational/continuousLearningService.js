'use strict';

/**
 * FASE 10 — CONTINUOUS OPERATIONAL LEARNING
 *
 * Aprendizado supervisionado contínuo via feedback loops.
 * A IA aprende timing, contexto, intensidade e padrões operacionais ideais.
 *
 * Feature flag: CONTINUOUS_LEARNING_ENABLED (default true)
 *
 * Feedback types:
 *   - task_quality: qualidade da tarefa gerada
 *   - delay_pattern: padrão de atraso recorrente
 *   - ignored_reminder: lembrete ignorado
 *   - useful_report: relatório útil
 *   - false_positive: alerta falso positivo
 *   - saturation: métrica de saturação cognitiva
 *
 * ❌ sem self-modifying runtime
 * ❌ sem autonomous mutation
 */

const db = require('../../db');

const ENABLED = process.env.CONTINUOUS_LEARNING_ENABLED !== 'false';

const FEEDBACK_TYPES = Object.freeze([
  'task_quality', 'delay_pattern', 'ignored_reminder',
  'useful_report', 'false_positive', 'saturation',
  'timing_feedback', 'context_feedback', 'general'
]);

const _feedbackBuffer = [];
const BUFFER_MAX = 200;

const _patterns = new Map();

/**
 * Registra feedback operacional.
 */
function recordFeedback(params = {}) {
  if (!ENABLED) return { ok: false };

  const { companyId, userId, feedbackType, entityId, rating, comment, metadata = {} } = params;

  if (!companyId || !feedbackType) return { ok: false, reason: 'missing_params' };
  if (!FEEDBACK_TYPES.includes(feedbackType)) return { ok: false, reason: 'invalid_type' };

  const entry = {
    companyId, userId, feedbackType, entityId,
    rating: Math.max(0, Math.min(5, rating || 3)),
    comment: (comment || '').slice(0, 500),
    metadata, timestamp: new Date().toISOString()
  };

  _feedbackBuffer.push(entry);
  if (_feedbackBuffer.length > BUFFER_MAX) _feedbackBuffer.shift();

  _updatePatterns(entry);

  setImmediate(() => {
    _persistFeedback(entry).catch(err => {
      console.warn('[CONTINUOUS_LEARNING] persist:', err.message);
    });
  });

  return { ok: true, recorded: true };
}

function _updatePatterns(entry) {
  const key = `${entry.companyId}:${entry.feedbackType}`;
  const pattern = _patterns.get(key) || {
    type: entry.feedbackType,
    totalRating: 0,
    count: 0,
    lastUpdated: null,
    lowRatings: 0
  };

  pattern.totalRating += entry.rating;
  pattern.count++;
  pattern.lastUpdated = entry.timestamp;
  if (entry.rating <= 2) pattern.lowRatings++;

  _patterns.set(key, pattern);
}

async function _persistFeedback(entry) {
  try {
    await db.query(`
      INSERT INTO memory_audit_log (company_id, user_id, action, scope_filter, facts_count, source_type)
      VALUES ($1, $2, $3, $4, $5, 'continuous_learning')
    `, [
      entry.companyId,
      entry.userId,
      `feedback:${entry.feedbackType}`,
      JSON.stringify({ rating: entry.rating, entityId: entry.entityId, comment: entry.comment }),
      entry.rating
    ]);
  } catch (_) {}
}

/**
 * Obtém padrões aprendidos para a empresa.
 */
function getLearnedPatterns(companyId) {
  if (!ENABLED) return [];

  const results = [];
  for (const [key, pattern] of _patterns.entries()) {
    if (key.startsWith(`${companyId}:`)) {
      const avgRating = pattern.count > 0 ? pattern.totalRating / pattern.count : 0;
      results.push({
        type: pattern.type,
        avgRating: Math.round(avgRating * 100) / 100,
        sampleSize: pattern.count,
        lowRatingPercent: pattern.count > 0
          ? Math.round((pattern.lowRatings / pattern.count) * 100)
          : 0,
        lastUpdated: pattern.lastUpdated,
        recommendation: _generateRecommendation(pattern)
      });
    }
  }
  return results;
}

function _generateRecommendation(pattern) {
  const avg = pattern.count > 0 ? pattern.totalRating / pattern.count : 3;
  const lowPct = pattern.count > 0 ? pattern.lowRatings / pattern.count : 0;

  if (pattern.type === 'ignored_reminder' && pattern.count >= 3) {
    return 'Ajustar timing dos lembretes — muitos estão sendo ignorados';
  }
  if (pattern.type === 'false_positive' && lowPct > 0.3) {
    return 'Refinar critérios de detecção — taxa de falsos positivos elevada';
  }
  if (pattern.type === 'saturation' && avg < 2.5) {
    return 'Reduzir volume de alertas e notificações — usuários saturados';
  }
  if (avg < 2) {
    return `Qualidade baixa em "${pattern.type}" — investigar e ajustar`;
  }
  return null;
}

/**
 * Retorna insights de aprendizado para dashboard executivo.
 */
function getLearningInsights(companyId) {
  const patterns = getLearnedPatterns(companyId);
  const totalFeedback = patterns.reduce((s, p) => s + p.sampleSize, 0);
  const avgQuality = patterns.length > 0
    ? patterns.reduce((s, p) => s + p.avgRating, 0) / patterns.length
    : 0;

  return {
    totalFeedbackRecorded: totalFeedback,
    patternCount: patterns.length,
    averageQuality: Math.round(avgQuality * 100) / 100,
    recommendations: patterns.filter(p => p.recommendation).map(p => ({
      area: p.type,
      recommendation: p.recommendation,
      confidence: Math.min(p.sampleSize / 10, 1)
    })),
    patterns
  };
}

module.exports = {
  recordFeedback,
  getLearnedPatterns,
  getLearningInsights,
  FEEDBACK_TYPES,
  isEnabled: () => ENABLED
};
