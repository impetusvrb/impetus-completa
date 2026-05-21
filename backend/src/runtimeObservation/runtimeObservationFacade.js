'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { observeDeliveryLeakage } = require('./runtimeDeliveryLeakageObserver');
const { observeHierarchyMismatch } = require('./hierarchyMismatchObserver');
const { observeContextualUnderdelivery } = require('./contextualUnderdeliveryObserver');
const { observeDashboardGenericity } = require('./dashboardGenericityObserver');
const { observeAuthorityConflicts } = require('./authorityConflictObserver');
const { validateOperationalIdentity } = require('./operationalIdentityValidator');

function isRuntimeObservationLayerActive() {
  return flags.isRuntimeObservationObservabilityEnabled() || flags.isRuntimeObservationEnabled();
}

function getRuntimeObservationStatus(ctx = {}) {
  return {
    phase: 'Z.0',
    layer: 'runtime-observation',
    observation: flags.isRuntimeObservationEnabled(),
    observability: flags.isRuntimeObservationObservabilityEnabled(),
    recommendation_only: true,
    auto_block: false,
    auto_remediate: false,
    tenant_id: ctx.tenant_id
  };
}

function observeRuntimeDelivery(ctx = {}) {
  const leakage = observeDeliveryLeakage(ctx);
  const hierarchy = observeHierarchyMismatch(ctx);
  const underdelivery = observeContextualUnderdelivery(ctx);
  const genericity = observeDashboardGenericity(ctx);
  const authority = observeAuthorityConflicts(ctx);
  const identity = validateOperationalIdentity(ctx);

  const issues =
    (leakage.leak_count || 0) +
    (hierarchy.mismatches?.length || 0) +
    (underdelivery.gaps?.length || 0) +
    (genericity.signals?.length || 0) +
    (authority.conflicts?.length || 0) +
    (identity.missing_fields?.length || 0);

  return {
    status: getRuntimeObservationStatus(ctx),
    leakage,
    hierarchy,
    underdelivery,
    genericity,
    authority,
    identity,
    issue_total: issues,
    rollout_safe: issues < 5,
    recommendation_only: true,
    auto_apply: false
  };
}

function getRuntimeObservationReport(ctx = {}) {
  const observation = observeRuntimeDelivery(ctx);
  return { ok: true, ...observation, auto_block: false, auto_remediate: false };
}

module.exports = {
  isRuntimeObservationLayerActive,
  getRuntimeObservationStatus,
  observeRuntimeDelivery,
  getRuntimeObservationReport,
  observeDeliveryLeakage,
  observeHierarchyMismatch,
  observeContextualUnderdelivery,
  observeDashboardGenericity,
  observeAuthorityConflicts,
  validateOperationalIdentity
};
