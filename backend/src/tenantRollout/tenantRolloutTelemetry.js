'use strict';

const _m = { activations: 0, deactivations: 0, blocked: 0, tenants_observed: 0 };

function recordActivation() {
  _m.activations += 1;
}
function recordDeactivation() {
  _m.deactivations += 1;
}
function recordBlocked() {
  _m.blocked += 1;
}
function recordTenantObserved() {
  _m.tenants_observed += 1;
}

function getTenantRolloutTelemetry() {
  return { ..._m, ts: new Date().toISOString() };
}

function resetTenantRolloutTelemetry() {
  _m.activations = 0;
  _m.deactivations = 0;
  _m.blocked = 0;
  _m.tenants_observed = 0;
}

module.exports = {
  recordActivation,
  recordDeactivation,
  recordBlocked,
  recordTenantObserved,
  getTenantRolloutTelemetry,
  resetTenantRolloutTelemetry
};
