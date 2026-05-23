'use strict';

function validateProductionFallbackIntegrity(payload = {}, consolidated = {}) {
  const empty = consolidated.telemetry_readiness === 'empty';
  const hasCenters = (consolidated.centers?.length ?? 0) > 0;
  const legacy = payload.widgets_legacy?.length > 0 || payload.profile_config?.widgets?.length > 0;
  return {
    fallback_elegant: empty ? hasCenters || legacy : true,
    cockpit_not_broken: consolidated.consolidation_applied !== false || empty,
    underdelivery_severe: !hasCenters && !legacy && !empty,
    legacy_preserved: legacy || payload.production_cognitive_runtime?.global_replace === false
  };
}

module.exports = { validateProductionFallbackIntegrity };
