'use strict';

/**
 * Etapa 6 — Controlled Enterprise Rollout (default off).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isQualityRolloutRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED', false);
}

function isTenantRolloutEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_TENANT_ROLLOUT_ENABLED', false);
}

function isPlantRolloutEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_PLANT_ROLLOUT_ENABLED', false);
}

function isWorkflowRolloutEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_WORKFLOW_ROLLOUT_ENABLED', false);
}

function isMaturityScoringEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_MATURITY_SCORING_ENABLED', false);
}

function isAdoptionAnalyticsEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_ADOPTION_ANALYTICS_ENABLED', false);
}

function isSaturationProtectionRolloutEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_SATURATION_PROTECTION_ENABLED', false);
}

function isReadinessEngineEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_READINESS_ENGINE_ENABLED', false);
}

function isRolloutIndustrialPublishEnabled() {
  return isQualityRolloutRuntimeEnabled() && envBool('IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED', false);
}

function getRolloutRuntimeFlagSnapshot() {
  return {
    rollout_runtime: isQualityRolloutRuntimeEnabled(),
    tenant_rollout: isTenantRolloutEnabled(),
    plant_rollout: isPlantRolloutEnabled(),
    workflow_rollout: isWorkflowRolloutEnabled(),
    maturity_scoring: isMaturityScoringEnabled(),
    adoption_analytics: isAdoptionAnalyticsEnabled(),
    saturation_protection: isSaturationProtectionRolloutEnabled(),
    readiness_engine: isReadinessEngineEnabled(),
    industrial_publish: isRolloutIndustrialPublishEnabled()
  };
}

module.exports = {
  isQualityRolloutRuntimeEnabled,
  isTenantRolloutEnabled,
  isPlantRolloutEnabled,
  isWorkflowRolloutEnabled,
  isMaturityScoringEnabled,
  isAdoptionAnalyticsEnabled,
  isSaturationProtectionRolloutEnabled,
  isReadinessEngineEnabled,
  isRolloutIndustrialPublishEnabled,
  getRolloutRuntimeFlagSnapshot
};
