'use strict';

function assessNarrativeAuthorityConsistency(targetingPack = {}, ctx = {}) {
  const hierarchy = targetingPack.hierarchy || {};
  const functional = targetingPack.functional || {};
  const conflicting =
    hierarchy.hierarchy_mismatch && functional.cross_domain_risk && !hierarchy.narrative_leakage;

  return {
    consistent: !hierarchy.narrative_leakage && !conflicting,
    conflicting_guidance: conflicting,
    authority_aligned: !hierarchy.narrative_leakage
  };
}

module.exports = { assessNarrativeAuthorityConsistency };
