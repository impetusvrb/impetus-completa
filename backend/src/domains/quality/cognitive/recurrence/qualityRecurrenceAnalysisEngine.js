'use strict';

const { buildCognitiveExplainability } = require('../explainability/qualityCognitiveExplainability');

function _parseTs(v) {
  const t = v != null ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
}

/**
 * Análise de recorrência — janelas temporais, clusters simples por entidade.
 * @param {Array<{ entity_type?: string, entity_id?: string, kind?: string, occurred_at?: string|number }>} records
 */
function analyzeRecurrence(records = [], opts = {}) {
  const windowMs = (opts.window_hours ?? 720) * 3600000;
  const minClusterGapMs = (opts.min_cluster_gap_minutes ?? 120) * 60000;
  const now = Date.now();
  const items = (Array.isArray(records) ? records : [])
    .map((r) => ({
      entity_type: r.entity_type != null ? String(r.entity_type).slice(0, 64) : 'unknown',
      entity_id: r.entity_id != null ? String(r.entity_id).slice(0, 128) : 'unknown',
      kind: r.kind != null ? String(r.kind).slice(0, 64) : 'event',
      ts: _parseTs(r.occurred_at)
    }))
    .filter((r) => r.ts != null && now - r.ts <= windowMs)
    .sort((a, b) => a.ts - b.ts);

  if (items.length < 2) {
    return {
      ok: false,
      error: 'insufficient_records',
      explainability: buildCognitiveExplainability({
        rationale: 'Menos de dois eventos na janela — recorrência não quantificável.',
        evidence: [`window_h=${opts.window_hours ?? 720}`],
        confidence: 0
      })
    };
  }

  const keyCounts = new Map();
  const gaps = [];
  for (let i = 0; i < items.length; i++) {
    const k = `${items[i].entity_type}|${items[i].entity_id}|${items[i].kind}`;
    keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
    if (i > 0 && items[i].entity_id === items[i - 1].entity_id && items[i].kind === items[i - 1].kind) {
      gaps.push(items[i].ts - items[i - 1].ts);
    }
  }

  let maxKey = null;
  let maxN = 0;
  for (const [k, n] of keyCounts.entries()) {
    if (n > maxN) {
      maxN = n;
      maxKey = k;
    }
  }

  const recurrenceScore = Math.min(1, maxN / Math.max(4, (opts.reference_events ?? 8)));
  const avgGap = gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : null;
  const tightClustering = avgGap != null && avgGap < minClusterGapMs * (opts.tight_cluster_factor ?? 3);

  const severity =
    maxN >= (opts.high_threshold ?? 6) || (recurrenceScore >= 0.75 && tightClustering)
      ? 'high'
      : maxN >= (opts.med_threshold ?? 4) || recurrenceScore >= 0.45
        ? 'medium'
        : 'low';

  const confidence = Math.min(1, 0.25 + recurrenceScore * 0.55 + (tightClustering ? 0.2 : 0));

  return {
    ok: true,
    recurrence_severity: severity,
    recurrence_score: recurrenceScore,
    dominant_key: maxKey,
    dominant_count: maxN,
    window_events: items.length,
    avg_gap_ms: avgGap,
    tight_clustering: !!tightClustering,
    emit_event: severity !== 'low' && confidence >= (opts.emit_confidence_min ?? 0.4),
    explainability: buildCognitiveExplainability({
      rationale: 'Contagem por chave contextual (entidade+tipo) dentro da janela temporal configurada.',
      evidence: [
        `dominant_key=${maxKey}`,
        `count=${maxN}`,
        `window_h=${opts.window_hours ?? 720}`,
        avgGap != null ? `avg_gap_min=${(avgGap / 60000).toFixed(2)}` : 'avg_gap=n/a'
      ],
      score: recurrenceScore,
      confidence,
      calculation: 'max_bucket_count_normalized + gap_heuristic',
      contributing_factors: [{ factor: 'dominant_bucket', value: maxN }, { factor: 'tight_clustering', value: tightClustering }],
      origin: 'quality_recurrence_analysis_engine'
    })
  };
}

module.exports = { analyzeRecurrence };
