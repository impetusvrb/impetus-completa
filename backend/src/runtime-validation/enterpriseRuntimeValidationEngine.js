'use strict';

const fs = require('fs');
const path = require('path');

function envBool(key) {
  return String(process.env[key] || '').toLowerCase() === 'true';
}

function readFlagSnapshot() {
  return {
    quality: {
      universal_runtime: envBool('IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED'),
      universal_shadow: envBool('IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE'),
      navigation: envBool('IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED'),
      publication: envBool('IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED'),
      governance: envBool('IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED'),
      cognitive: envBool('IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED'),
      rollout: envBool('IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED')
    },
    safety: {
      operational: envBool('IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED'),
      navigation: envBool('IMPETUS_SAFETY_NAVIGATION_RUNTIME_ENABLED'),
      publication: envBool('IMPETUS_SAFETY_PUBLICATION_RUNTIME_ENABLED'),
      governance: envBool('IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED'),
      cognitive: envBool('IMPETUS_SAFETY_COGNITIVE_RUNTIME_ENABLED'),
      rollout: envBool('IMPETUS_SAFETY_ROLLOUT_RUNTIME_ENABLED'),
      publication_shadow: envBool('IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE')
    },
    logistics: {
      operational: envBool('IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED'),
      navigation: envBool('IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED'),
      publication: envBool('IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED'),
      governance: envBool('IMPETUS_LOGISTICS_GOVERNANCE_RUNTIME_ENABLED'),
      cognitive: envBool('IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED'),
      rollout: envBool('IMPETUS_LOGISTICS_ROLLOUT_RUNTIME_ENABLED'),
      publication_shadow: envBool('IMPETUS_LOGISTICS_PUBLICATION_SHADOW_MODE')
    },
    cognitive_budget: envBool('IMPETUS_AI_CONTEXT_BUDGET_ENABLED'),
    observability_v2: envBool('IMPETUS_OBSERVABILITY_V2_ENABLED')
  };
}

function loadManifestPaths(domain) {
  try {
    if (domain === 'quality') {
      const m = require('../domains/quality/navigation/qualityNavigationManifest');
      return (m.QUALITY_NAVIGATION_MANIFEST || m.default || []).map((i) => i.path).filter(Boolean);
    }
    if (domain === 'safety') {
      const m = require('../domains/safety/navigation/safetyNavigationManifest');
      return (m.SAFETY_NAVIGATION_MANIFEST || []).map((i) => i.path).filter(Boolean);
    }
    if (domain === 'logistics') {
      const m = require('../domains/logistics/navigation/logisticsNavigationManifest');
      return (m.LOGISTICS_NAVIGATION_MANIFEST || []).map((i) => i.path).filter(Boolean);
    }
  } catch {
    return [];
  }
  return [];
}

function detectManifestCollisions(pathsA, pathsB) {
  const setA = new Set(pathsA);
  const collisions = [];
  for (const p of pathsB) {
    if (setA.has(p)) collisions.push(p);
  }
  return collisions;
}

function detectDuplicatePaths(paths) {
  const seen = new Map();
  const dups = [];
  for (const p of paths) {
    const n = (seen.get(p) || 0) + 1;
    seen.set(p, n);
    if (n === 2) dups.push(p);
  }
  return dups;
}

function validateRouteMounts() {
  const issues = [];
  try {
    const serverPath = path.join(__dirname, '../server.js');
    const src = fs.readFileSync(serverPath, 'utf8');
    const required = [
      '/api/safety-operational-validation',
      '/api/logistics-operational-validation',
      '/api/enterprise-runtime-validation'
    ];
    for (const r of required) {
      if (!src.includes(r)) {
        issues.push({ code: 'route_mount_missing', route: r });
      }
    }
  } catch {
    issues.push({ code: 'server_read_failed' });
  }
  return issues;
}

/**
 * EnterpriseRuntimeValidationEngine — validação estática/runtime de publication, navigation, bounded contexts.
 * @param {object} [ctx]
 */
function validateEnterpriseRuntime(ctx = {}) {
  const started = Date.now();
  const flags = readFlagSnapshot();
  const qualityPaths = loadManifestPaths('quality');
  const safetyPaths = loadManifestPaths('safety');
  const logisticsPaths = loadManifestPaths('logistics');
  const qsCollisions = detectManifestCollisions(qualityPaths, safetyPaths);
  const qlCollisions = detectManifestCollisions(qualityPaths, logisticsPaths);
  const slCollisions = detectManifestCollisions(safetyPaths, logisticsPaths);
  const crossCollisions = [...new Set([...qsCollisions, ...qlCollisions, ...slCollisions])];
  const qualityDupes = detectDuplicatePaths(qualityPaths);
  const safetyDupes = detectDuplicatePaths(safetyPaths);
  const logisticsDupes = detectDuplicatePaths(logisticsPaths);
  const mountIssues = validateRouteMounts();

  const conflicts = [];
  if (crossCollisions.length) {
    conflicts.push({ code: 'cross_domain_path_collision', paths: crossCollisions, domains: 'quality|safety|logistics' });
  }
  if (qualityDupes.length) {
    conflicts.push({ code: 'quality_manifest_duplicates', paths: qualityDupes });
  }
  if (safetyDupes.length) {
    conflicts.push({ code: 'safety_manifest_duplicates', paths: safetyDupes });
  }
  if (logisticsDupes.length) {
    conflicts.push({ code: 'logistics_manifest_duplicates', paths: logisticsDupes });
  }
  if (flags.safety.publication && flags.safety.publication_shadow && flags.safety.operational === false) {
    conflicts.push({ code: 'safety_publication_without_operational' });
  }
  if (flags.logistics.publication && flags.logistics.publication_shadow && flags.logistics.operational === false) {
    conflicts.push({ code: 'logistics_publication_without_operational' });
  }

  const stable =
    conflicts.length === 0 &&
    mountIssues.length === 0 &&
    (ctx.require_quality_runtime ? flags.quality.universal_runtime : true);

  return {
    ok: true,
    stable,
    runtime_validation_ms: Date.now() - started,
    flags,
    manifests: {
      quality_route_count: qualityPaths.length,
      safety_route_count: safetyPaths.length,
      logistics_route_count: logisticsPaths.length,
      cross_collisions: crossCollisions,
      quality_duplicates: qualityDupes,
      safety_duplicates: safetyDupes,
      logistics_duplicates: logisticsDupes
    },
    conflicts,
    mount_issues: mountIssues,
    bounded_contexts: ['quality', 'safety', 'logistics', 'dashboard', 'chat', 'ia'],
    legacy_coexistence: true,
    fallback_navigation_preserved: true
  };
}

module.exports = {
  validateEnterpriseRuntime,
  readFlagSnapshot
};
