'use strict';

function isolateNarrativeByDomain(payload = {}, ctx = {}) {
  const axis = ctx.canonical_identity?.domain_axis || ctx.domain_axis;
  const text = String(payload.summary || payload.narrative || payload.text || '');
  const crossHints = [];
  if (axis === 'quality' && /sst|seguran[cç]a do trabalho|apr\b|loto\b/i.test(text)) {
    crossHints.push('sst_narrative_on_quality');
  }
  if (axis === 'hr' && /nao conformidade|spc\b|capa\b/i.test(text) && !/rh|recursos humanos/i.test(text)) {
    crossHints.push('quality_narrative_on_hr');
  }
  return {
    payload,
    cross_domain_hints: crossHints,
    isolation_observed: crossHints.length > 0,
    rewrite_applied: false,
    semantic_truth_preserved: true
  };
}

module.exports = { isolateNarrativeByDomain };
