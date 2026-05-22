'use strict';

function buildQualitySpecializedInsights(bindings = [], engineContext = {}) {
  const insights = [];
  const ctxBlock = bindings.find((b) => b.block_id === 'quality.contextual_quality_ai');

  if (ctxBlock?.engine_output?.recommendations?.length) {
    for (const r of ctxBlock.engine_output.recommendations.slice(0, 5)) {
      insights.push({
        id: `quality_reco_${insights.length}`,
        title: r.kind || 'recomendação',
        body: r.rationale,
        priority: r.priority || 'medium',
        domain: 'quality',
        source: 'z21_contextual_quality_ai',
        assistive_only: true
      });
    }
  }

  for (const b of bindings) {
    if (!b.summary || b.block_id === 'quality.contextual_quality_ai') continue;
    if (b.bridge_status !== 'bound_z20') continue;
    insights.push({
      id: `quality_insight_${b.block_id.replace(/\./g, '_')}`,
      title: b.block_id.replace('quality.', ''),
      body: b.summary,
      priority: b.metrics?.drift_severity === 'high' ? 'high' : 'medium',
      domain: 'quality',
      source: 'z21_engine_bridge',
      assistive_only: true
    });
  }

  if (!insights.length && engineContext.findings?.length) {
    for (const f of engineContext.findings.slice(0, 3)) {
      insights.push({
        id: `quality_finding_${insights.length}`,
        title: f.kind,
        body: f.rationale,
        priority: f.priority || 'medium',
        domain: 'quality',
        source: 'z21_engine_findings'
      });
    }
  }

  return {
    insights,
    count: insights.length,
    domain: 'quality'
  };
}

module.exports = { buildQualitySpecializedInsights };
