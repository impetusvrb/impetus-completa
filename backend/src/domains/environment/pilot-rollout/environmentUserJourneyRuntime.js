'use strict';

const audience = require('../publication/environmentAudienceResolver');

const JOURNEY_BY_BAND = Object.freeze({
  operator: ['effluent', 'water', 'field', 'telemetry'],
  technician: ['waste', 'compliance', 'field', 'emissions'],
  coordinator: ['esg', 'telemetry', 'intelligence', 'maturity'],
  director: ['executive', 'carbon', 'sustainability', 'intelligence']
});

function environmentAudienceJourneyRuntime(band) {
  const manifestIds = audience.resolveAudienceManifestIds(band);
  return { band, manifest_ids: manifestIds, journey_steps: JOURNEY_BY_BAND[band] || [] };
}

function environmentOperationalFlowRuntime(band = 'operator') {
  return {
    band,
    flow: ['collect', 'inspect', 'evidence', 'sync'],
    mobile_ergonomics_safe: band === 'operator' || band === 'technician'
  };
}

function environmentExecutiveFlowRuntime(band = 'director') {
  return {
    band,
    flow: ['strategic_kpi', 'heatmap', 'narrative', 'governance'],
    executive_ergonomics_safe: band === 'director' || band === 'manager'
  };
}

function environmentUserJourneyRuntime(user) {
  const band = audience.resolveEnvironmentAudienceBand(user);
  return {
    band,
    audience_journey: environmentAudienceJourneyRuntime(band),
    operational_flow: environmentOperationalFlowRuntime(band),
    executive_flow: ['director', 'manager'].includes(band) ? environmentExecutiveFlowRuntime(band) : null
  };
}

module.exports = {
  environmentUserJourneyRuntime,
  environmentAudienceJourneyRuntime,
  environmentOperationalFlowRuntime,
  environmentExecutiveFlowRuntime
};
