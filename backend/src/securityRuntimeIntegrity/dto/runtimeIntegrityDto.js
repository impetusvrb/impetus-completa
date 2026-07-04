'use strict';

/**
 * SEC-04 — Runtime Integrity DTO.
 */

const STATUSES = Object.freeze(['INTEGRITY_OK', 'DEGRADED', 'COMPROMISED', 'UNKNOWN']);

let seq = 0;

function nextRuntimeIntegrityId() {
  seq += 1;
  return `ri-${Date.now()}-${seq.toString(36)}`;
}

/**
 * @param {object} input
 * @returns {object}
 */
function createRuntimeIntegrityDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'runtime_integrity_v1',
    runtimeIntegrityId: input.runtimeIntegrityId || nextRuntimeIntegrityId(),
    integrityStatus: STATUSES.includes(input.integrityStatus) ? input.integrityStatus : 'UNKNOWN',
    baselineVersion: input.baselineVersion || 'SECURITY-BASELINE-01',
    baselineTimestamp: input.baselineTimestamp || null,
    gitHeadBaseline: input.gitHeadBaseline || null,
    gitHeadCurrent: input.gitHeadCurrent || null,
    integrityScore: Math.min(1, Math.max(0, Number(input.integrityScore) || 0)),
    criticalFindings: Array.isArray(input.criticalFindings) ? [...input.criticalFindings] : [],
    warnings: Array.isArray(input.warnings) ? [...input.warnings] : [],
    hashValidation: input.hashValidation || emptySection('hash'),
    configurationValidation: input.configurationValidation || emptySection('configuration'),
    runtimeValidation: input.runtimeValidation || emptySection('runtime'),
    filesystemValidation: input.filesystemValidation || emptySection('filesystem'),
    networkValidation: input.networkValidation || emptySection('network'),
    recommendations: Array.isArray(input.recommendations) ? [...input.recommendations] : [],
    checkedAt: input.checkedAt || now,
    mode: 'observational_only',
    no_auto_remediation: true
  };
}

function emptySection(kind) {
  return {
    kind,
    status: 'UNKNOWN',
    passed: false,
    findings: [],
    summary: 'Não verificado'
  };
}

function freezeReport(report) {
  return Object.freeze(JSON.parse(JSON.stringify(report)));
}

module.exports = {
  STATUSES,
  createRuntimeIntegrityDto,
  freezeReport,
  nextRuntimeIntegrityId
};
