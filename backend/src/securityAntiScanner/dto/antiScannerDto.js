'use strict';

/**
 * SEC-15 — Anti-Enumeration Dashboard DTO.
 */

function createAntiScannerDashboardDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'anti_scanner_v1',
    read_only: true,
    enabled: input.enabled === true,
    mode: input.mode || 'observe',
    scannerDetected: input.scannerDetected === true,
    scannerConfidence: input.scannerConfidence ?? null,
    enumerationDetected: input.enumerationDetected === true,
    attackPattern: input.attackPattern || 'NONE',
    protectionRecommendation: input.protectionRecommendation || 'no_action',
    recommendedSurfaceProfile: input.recommendedSurfaceProfile || 'NORMAL',
    approvalRequired: input.approvalRequired !== false,
    executionAllowed: false,
    confidence: input.confidence || null,
    scannerFingerprints: input.scannerFingerprints || [],
    enumerationProfiles: input.enumerationProfiles || [],
    surfacePlans: input.surfacePlans || [],
    modules_snapshot: input.modules_snapshot || {},
    metrics: input.metrics || {},
    disclaimer: input.disclaimer || 'SEC-15 — analítico e consultivo only',
    generatedAt: input.generatedAt || now
  };
}

function freezeDto(obj) {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

module.exports = { createAntiScannerDashboardDto, freezeDto };
