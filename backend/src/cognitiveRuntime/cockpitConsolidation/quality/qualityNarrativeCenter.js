'use strict';

function buildQualityNarrativeCenter(bindings = [], engineContext = {}) {
  const narrative = bindings.find((b) => b.block_id === 'quality.quality_narrative');
  const paragraphs = narrative?.engine_output?.paragraphs || engineContext.narrative_paragraphs || [];

  return {
    center_id: 'quality_narrative',
    label: 'Narrativa executiva de qualidade',
    layer: 'strategic',
    weight: 0.1,
    render_slot: 'insights_ia',
    metrics: {
      paragraph_count: paragraphs.length,
      has_headline: !!narrative?.engine_output?.headline
    },
    headline: narrative?.engine_output?.headline || 'Qualidade operacional',
    text: paragraphs.join('\n\n') || narrative?.summary || '',
    ok: paragraphs.length > 0 || !!narrative?.summary
  };
}

module.exports = { buildQualityNarrativeCenter };
