'use strict';

function buildSafetyNarrativeCenter(bindings = [], engineContext = {}) {
  const nar = bindings.find((b) => b.block_id === 'sst.safety_narrative');
  const paragraphs = nar?.engine_output?.paragraphs || engineContext.narrative_paragraphs || [];
  return {
    center_id: 'safety_narrative',
    label: 'Narrativa SST',
    layer: 'strategic',
    weight: 0.08,
    render_slot: 'insights_ia',
    metrics: { paragraph_count: paragraphs.length },
    narrative: paragraphs.join('\n\n') || nar?.summary || 'Resumo de segurança operacional',
    summary: paragraphs[0] || nar?.summary || 'Governança SST',
    ok: paragraphs.length > 0
  };
}

module.exports = { buildSafetyNarrativeCenter };
