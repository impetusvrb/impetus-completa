'use strict';

function truthy(v) {
  return String(v || '').toLowerCase() === 'true' || v === '1';
}

function isSafetyOperationalRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED);
}

function isSafetyOfflineRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_OFFLINE_RUNTIME_ENABLED);
}

function isSafetyKioskRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_KIOSK_RUNTIME_ENABLED);
}

function getOperationalRuntimeFlagSnapshot() {
  return {
    operational: isSafetyOperationalRuntimeEnabled(),
    offline: isSafetyOfflineRuntimeEnabled(),
    kiosk: isSafetyKioskRuntimeEnabled()
  };
}

module.exports = {
  isSafetyOperationalRuntimeEnabled,
  isSafetyOfflineRuntimeEnabled,
  isSafetyKioskRuntimeEnabled,
  getOperationalRuntimeFlagSnapshot
};
