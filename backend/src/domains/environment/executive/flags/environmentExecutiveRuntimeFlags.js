'use strict';

/**
 * Etapa 5 — Environment Executive Runtime (shadow-first, additive).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isEnvironmentExecutiveRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED', false);
}

function isEnvironmentExecutiveEsgCockpitEnabled() {
  return isEnvironmentExecutiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_ESG_COCKPIT_ENABLED', true);
}

function isEnvironmentExecutiveSustainabilityEnabled() {
  return isEnvironmentExecutiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_SUSTAINABILITY_ENABLED', true);
}

function isEnvironmentExecutiveCarbonAnalyticsEnabled() {
  return isEnvironmentExecutiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_CARBON_ANALYTICS_ENABLED', true);
}

function isEnvironmentExecutiveHeatmapsEnabled() {
  return isEnvironmentExecutiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_HEATMAPS_ENABLED', true);
}

function isEnvironmentExecutiveRiskMapsEnabled() {
  return isEnvironmentExecutiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_RISK_MAPS_ENABLED', true);
}

function isEnvironmentExecutiveIntelligenceCenterEnabled() {
  return isEnvironmentExecutiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_INTELLIGENCE_CENTER_ENABLED', true);
}

function isEnvironmentExecutivePublishEnabled() {
  return isEnvironmentExecutiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXECUTIVE_PUBLISH_EVENTS_ENABLED', false);
}

function getExecutiveRuntimeFlagSnapshot() {
  return {
    executive_runtime: isEnvironmentExecutiveRuntimeEnabled(),
    esg_cockpit: isEnvironmentExecutiveEsgCockpitEnabled(),
    sustainability: isEnvironmentExecutiveSustainabilityEnabled(),
    carbon_analytics: isEnvironmentExecutiveCarbonAnalyticsEnabled(),
    heatmaps: isEnvironmentExecutiveHeatmapsEnabled(),
    risk_maps: isEnvironmentExecutiveRiskMapsEnabled(),
    intelligence_center: isEnvironmentExecutiveIntelligenceCenterEnabled(),
    industrial_publish: isEnvironmentExecutivePublishEnabled(),
    auto_promotion: false,
    assistive_only: true
  };
}

module.exports = {
  isEnvironmentExecutiveRuntimeEnabled,
  isEnvironmentExecutiveEsgCockpitEnabled,
  isEnvironmentExecutiveSustainabilityEnabled,
  isEnvironmentExecutiveCarbonAnalyticsEnabled,
  isEnvironmentExecutiveHeatmapsEnabled,
  isEnvironmentExecutiveRiskMapsEnabled,
  isEnvironmentExecutiveIntelligenceCenterEnabled,
  isEnvironmentExecutivePublishEnabled,
  getExecutiveRuntimeFlagSnapshot
};
