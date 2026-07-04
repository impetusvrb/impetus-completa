'use strict';

/**
 * SEC-17 — Sensitive Asset Registry.
 * Catálogo lógico de ativos estratégicos — sem verificação física em runtime.
 */

const metrics = require('../metrics/exfiltrationMetrics');

const ASSET_CATEGORIES = Object.freeze([
  'source_code',
  'documentation',
  'configuration',
  'credentials',
  'certificates',
  'public_bundle',
  'backup',
  'audit_artifact',
  'strategic_doc'
]);

const REGISTRY = Object.freeze([
  {
    assetId: 'asset-backend-src',
    name: 'Código backend',
    category: 'source_code',
    logicalPath: 'backend/src/',
    criticality: 'CRITICAL',
    expectedExposure: 'internal',
    protectionPolicy: 'no_public_access'
  },
  {
    assetId: 'asset-frontend-src',
    name: 'Código frontend',
    category: 'source_code',
    logicalPath: 'frontend/src/',
    criticality: 'CRITICAL',
    expectedExposure: 'internal',
    protectionPolicy: 'no_public_access'
  },
  {
    assetId: 'asset-blueprint-vol',
    name: 'Blueprint Vol. 00–10',
    category: 'strategic_doc',
    logicalPath: 'backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/',
    criticality: 'HIGH',
    expectedExposure: 'internal',
    protectionPolicy: 'audit_all_access'
  },
  {
    assetId: 'asset-adrs',
    name: 'ADRs Enterprise',
    category: 'documentation',
    logicalPath: 'backend/docs/',
    criticality: 'HIGH',
    expectedExposure: 'internal',
    protectionPolicy: 'audit_all_access'
  },
  {
    assetId: 'asset-enterprise-docs',
    name: 'Documentação Enterprise',
    category: 'documentation',
    logicalPath: 'backend/docs/SEC_',
    criticality: 'HIGH',
    expectedExposure: 'internal',
    protectionPolicy: 'monitor_continuous'
  },
  {
    assetId: 'asset-audit-scripts',
    name: 'Scripts de auditoria',
    category: 'audit_artifact',
    logicalPath: 'backend/src/tests/',
    criticality: 'HIGH',
    expectedExposure: 'internal',
    protectionPolicy: 'no_public_access'
  },
  {
    assetId: 'asset-env',
    name: 'Arquivos .env',
    category: 'credentials',
    logicalPath: '.env',
    criticality: 'CRITICAL',
    expectedExposure: 'never',
    protectionPolicy: 'block_public_never_serve'
  },
  {
    assetId: 'asset-certificates',
    name: 'Certificados',
    category: 'certificates',
    logicalPath: 'certs/',
    criticality: 'CRITICAL',
    expectedExposure: 'never',
    protectionPolicy: 'block_public_never_serve'
  },
  {
    assetId: 'asset-config',
    name: 'Configurações',
    category: 'configuration',
    logicalPath: 'backend/.env.example',
    criticality: 'HIGH',
    expectedExposure: 'restricted',
    protectionPolicy: 'monitor_continuous'
  },
  {
    assetId: 'asset-public-bundle',
    name: 'Bundles públicos',
    category: 'public_bundle',
    logicalPath: 'frontend/dist/',
    criticality: 'MEDIUM',
    expectedExposure: 'public',
    protectionPolicy: 'rate_monitor'
  },
  {
    assetId: 'asset-backups',
    name: 'Backups',
    category: 'backup',
    logicalPath: 'backup/',
    criticality: 'CRITICAL',
    expectedExposure: 'never',
    protectionPolicy: 'block_public_never_serve'
  },
  {
    assetId: 'asset-evidence',
    name: 'Artefactos críticos / evidências',
    category: 'audit_artifact',
    logicalPath: 'backend/docs/evidence/',
    criticality: 'HIGH',
    expectedExposure: 'internal',
    protectionPolicy: 'audit_all_access'
  }
]);

function getAllAssets() {
  metrics.increment('protected_assets', REGISTRY.length);
  return REGISTRY.map((a) => ({ ...a, registered: true }));
}

function getAssetById(assetId) {
  return REGISTRY.find((a) => a.assetId === assetId) || null;
}

function matchAssetsFromPaths(paths) {
  const matched = [];
  for (const raw of paths || []) {
    const p = String(raw).toLowerCase();
    for (const asset of REGISTRY) {
      const lp = asset.logicalPath.toLowerCase();
      if (p.includes(lp.replace(/\/$/, '')) || lp.includes(p.replace(/^\//, ''))) {
        matched.push({ ...asset, matchedPath: raw });
      }
    }
    if (p.includes('.env')) matched.push({ ...getAssetById('asset-env'), matchedPath: raw });
    if (p.includes('.git')) matched.push({ ...getAssetById('asset-backend-src'), matchedPath: raw });
    if (p.includes('backup')) matched.push({ ...getAssetById('asset-backups'), matchedPath: raw });
    if (p.includes('/docs/') || p.includes('.md')) {
      matched.push({ ...getAssetById('asset-enterprise-docs'), matchedPath: raw });
    }
  }
  const seen = new Set();
  return matched.filter((m) => {
    const k = m.assetId;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function getCriticalAssets() {
  return REGISTRY.filter((a) => a.criticality === 'CRITICAL');
}

module.exports = {
  ASSET_CATEGORIES,
  REGISTRY,
  getAllAssets,
  getAssetById,
  matchAssetsFromPaths,
  getCriticalAssets
};
