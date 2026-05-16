'use strict';

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isQualityOperationalRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED', false);
}

function isQualityOfflineRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_OFFLINE_RUNTIME_ENABLED', false);
}

function isQualityScannerRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_SCANNER_RUNTIME_ENABLED', false);
}

function isQualityRealtimeCollectionEnabled() {
  return envBool('IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED', false);
}

function isQualityKioskRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_KIOSK_RUNTIME_ENABLED', false);
}

function isQualityAttachmentRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_ATTACHMENT_RUNTIME_ENABLED', false);
}

function getOperationalRuntimeFlagSnapshot() {
  return {
    operational: isQualityOperationalRuntimeEnabled(),
    offline: isQualityOfflineRuntimeEnabled(),
    scanner: isQualityScannerRuntimeEnabled(),
    realtime_collection: isQualityRealtimeCollectionEnabled(),
    kiosk: isQualityKioskRuntimeEnabled(),
    attachment: isQualityAttachmentRuntimeEnabled()
  };
}

module.exports = {
  isQualityOperationalRuntimeEnabled,
  isQualityOfflineRuntimeEnabled,
  isQualityScannerRuntimeEnabled,
  isQualityRealtimeCollectionEnabled,
  isQualityKioskRuntimeEnabled,
  isQualityAttachmentRuntimeEnabled,
  getOperationalRuntimeFlagSnapshot
};
