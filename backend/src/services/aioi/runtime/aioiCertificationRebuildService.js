'use strict';

/**
 * AIOI-P1Q.3 — Certification Rebuild Validation
 * READ ONLY · verifica reconstituição de vereditos, critérios, manifest, registry.
 */

const fs = require('fs');
const path = require('path');
const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_CERTIFICATION_REBUILD';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

function _readDoc(filename) {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, filename), 'utf8');
  } catch {
    return null;
  }
}

function validateVerdictRebuild() {
  const details = [];
  let rebuildable = 0;
  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    const content = _readDoc(phase.doc);
    const hasVerdict = content && (
      new RegExp(phase.verdict.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(content)
      || /PASS|Veredito/i.test(content)
    );
    if (hasVerdict) rebuildable += 1;
    details.push({ phase: phase.id, verdict_rebuildable: !!hasVerdict, expected: phase.verdict });
  }
  return {
    all_rebuildable: rebuildable === ENTERPRISE_BASELINE_PHASE_COUNT,
    phases_rebuildable: rebuildable,
    expected: ENTERPRISE_BASELINE_PHASE_COUNT,
    details
  };
}

function validateCriteriaRebuild() {
  let covered = 0;
  const details = [];
  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    const content = _readDoc(phase.doc);
    const hasCriteria = content && (/Critério|criteria|PASS/i.test(content));
    if (hasCriteria) covered += 1;
    details.push({ phase: phase.id, criteria_rebuildable: !!hasCriteria });
  }
  return {
    coverage_percent: ENTERPRISE_BASELINE_PHASES.length
      ? Math.round((covered / ENTERPRISE_BASELINE_PHASES.length) * 100)
      : 0,
    criteria_rebuildable: covered >= Math.floor(ENTERPRISE_BASELINE_PHASES.length * 0.8),
    details
  };
}

function validateManifestRebuild() {
  const manifest = releaseManifest.generateReleaseManifest();
  const validation = releaseManifest.validateManifest();
  return {
    manifest_rebuildable: validation.release_manifest_ready === true,
    phases: manifest.phases,
    expected_phases: ENTERPRISE_BASELINE_PHASE_COUNT,
    certified: manifest.certified
  };
}

function validateRegistryRebuild() {
  const registry = baselineRegistry.getBaselineRegistry();
  return {
    registry_rebuildable: registry.baseline_registered === true,
    phases_present: registry.chain?.phases_present ?? 0,
    expected_phases: ENTERPRISE_BASELINE_PHASE_COUNT
  };
}

function generateRebuildStatus() {
  const verdicts = validateVerdictRebuild();
  const criteria = validateCriteriaRebuild();
  const manifest = validateManifestRebuild();
  const registry = validateRegistryRebuild();

  const certificationRebuildable = verdicts.all_rebuildable
    && criteria.criteria_rebuildable
    && manifest.manifest_rebuildable
    && registry.registry_rebuildable;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    certification_rebuildable: certificationRebuildable,
    verdicts,
    criteria,
    manifest,
    registry,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateVerdictRebuild,
  validateCriteriaRebuild,
  validateManifestRebuild,
  validateRegistryRebuild,
  generateRebuildStatus,
  LAYER
};
