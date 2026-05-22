'use strict';

const { buildExecutiveNarrative } = require('../../../domains/quality/cognitive/narratives/qualityExecutiveNarrativeEngine');

function buildQualitySpecializedSummary(bindings = [], engineContext = {}) {
  const narrativeBlock = bindings.find((b) => b.block_id === 'quality.quality_narrative');
  if (narrativeBlock?.engine_output?.paragraphs?.length) {
    const n = narrativeBlock.engine_output;
    return {
      ok: true,
      headline: n.headline,
      text: (n.paragraphs || []).join('\n\n'),
      summary: (n.paragraphs || []).join('\n\n'),
      domain: 'quality',
      source: 'z21_quality_narrative_engine',
      assistive_only: true
    };
  }

  const summary = engineContext.summary || {};
  const n = buildExecutiveNarrative(summary);
  const text = (n.paragraphs || []).join('\n\n');
  return {
    ok: n.ok,
    headline: n.headline,
    text,
    summary: text,
    domain: 'quality',
    source: 'z21_quality_summary_adapter',
    assistive_only: true
  };
}

function enrichSummaryPayload(existing = {}, specialized = {}) {
  if (!specialized.ok || !specialized.text) {
    return { payload: existing, enriched: false };
  }
  const legacyText = existing.summary || existing.text || '';
  return {
    payload: {
      ...existing,
      summary_legacy: legacyText || null,
      summary: specialized.text,
      text: specialized.text,
      specialized_summary: specialized,
      summary_enrichment_applied: true
    },
    enriched: true
  };
}

module.exports = {
  buildQualitySpecializedSummary,
  enrichSummaryPayload
};
