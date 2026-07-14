#!/usr/bin/env node
'use strict';

/**
 * IMPETUS-SEC-ANTI-RECON-006 — forensic audit (read-only).
 * node backend/scripts/sec006-forensic-audit.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(__dirname, '../docs/evidence/sec-anti-recon-006');
const MANIFEST_PATHS = [
  'backend/src/securityRecon/index.js',
  'backend/src/securityRecon/config/securityReconFlags.js',
  'backend/src/securityRecon/middleware/securityReconMiddleware.js',
  'backend/src/securityRecon/guard/validatedIdentityReconGuard.js',
  'backend/src/securityRecon/guard/edgeIngestValidatedGate.js',
  'backend/src/securityRecon/engine/securityReconCorrelationEngine.js',
  'backend/src/securityRecon/engine/postValidationDecision.js',
  'backend/src/securityRecon/engine/anonymousPreAuthPolicy.js',
  'backend/src/securityRecon/engine/validatedIdentityContext.js',
  'backend/src/securityRecon/engine/identityContext.js',
  'backend/src/securityRecon/engine/serviceIdentityMarker.js',
  'backend/src/securityRecon/engine/signalNormalizer.js',
  'backend/src/securityRecon/engine/scorePolicy.js',
  'backend/src/securityRecon/engine/decisionEventLimiter.js',
  'backend/src/securityRecon/engine/routeExposurePolicy.js',
  'backend/src/securityRecon/store/reconStateStore.js',
  'backend/src/securityRecon/dto/securitySignalDto.js',
  'backend/src/securityRecon/ingest/threatWatchSignalIngestor.js',
  'backend/src/securityRecon/runtime/securityReconRuntime.js',
  'backend/src/securityRecon/catalog/securitySignatureCatalog.js',
  'backend/src/securityRecon/catalog/security-signature-catalog.json',
  'backend/src/services/clientIpResolver.js',
  'backend/src/services/edgeTokenCrypto.js',
  'backend/src/services/nginxAccessLogPath.js',
  'backend/src/middleware/auth.js',
  'backend/src/middleware/adminPortalAuth.js',
  'backend/src/routes/integrations.js',
  'backend/src/services/edgeIngestService.js',
  'backend/scripts/sec-anti-recon-ip-equivalence.js',
  'backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_002.test.js',
  'backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_003.test.js',
  'backend/src/tests/securityRecon/IMPETUS_SEC_ANTI_RECON_004.test.js',
  'backend/scripts/sec005-go-live-validation.js',
  'backend/scripts/sec006-forensic-audit.js'
];

function sh(cmd) {
  return execSync(cmd, { cwd: REPO, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).trim();
}

function sha256File(abs) {
  const buf = fs.readFileSync(abs);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function classify(rel) {
  const p = rel.replace(/\\/g, '/');
  if (/securityRecon|sec-anti-recon|sec005|sec006|IMPETUS_SEC_ANTI_RECON|edgeTokenCrypto|clientIpResolver|nginxAccessLogPath/.test(p)) {
    if (/test|\.test\.js|scripts\/sec/.test(p)) return 'TESTS';
    if (/docs\/evidence/.test(p)) return 'EVIDENCE';
    if (/\.md$/.test(p)) return 'DOCUMENTATION';
    return 'SECURITY_RECON';
  }
  if (/securityObservatory|SEC_01|sec01|impetus-sec01/.test(p)) return 'SEC01_SECURITY';
  if (/adminPortalAuth|middleware\/auth|authorize|impetusAdmin\/auth/.test(p)) return 'AUTH_IDENTITY';
  if (/edgeIngest|edgeToken|integrations\.js|EDGE_/.test(p)) return 'EDGE_SECURITY';
  if (/nginx|infra\/|ufw|cloudflare|threat-watch/.test(p)) return 'NGINX_INFRA';
  if (/securityObservatory|observatory|threat-watch|SEC01/.test(p)) return 'OBSERVABILITY';
  if (/^frontend\//.test(p)) return 'FRONTEND';
  if (/\.md$|docs\//.test(p)) return 'DOCUMENTATION';
  if (/test|\.test\.|spec\./.test(p)) return 'TESTS';
  if (/evidence\//.test(p)) return 'EVIDENCE';
  if (/^backend\//.test(p)) return 'UNRELATED_BACKEND';
  return 'UNKNOWN';
}

function gitShowHead(rel) {
  try {
    return sh(`git show HEAD:${rel}`);
  } catch {
    return null;
  }
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const head = sh('git rev-parse HEAD');
  const statusLines = sh('git status --porcelain').split('\n').filter(Boolean);
  const diffTracked = sh('git diff --name-only').split('\n').filter(Boolean);
  const untracked = sh('git ls-files --others --exclude-standard').split('\n').filter(Boolean);

  const allChanged = new Set([...diffTracked, ...untracked]);
  const byCategory = {};
  for (const rel of allChanged) {
    const cat = classify(rel);
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const manifest = [];
  for (const rel of MANIFEST_PATHS) {
    const abs = path.join(REPO, rel);
    const entry = {
      relativePath: rel,
      exists: fs.existsSync(abs),
      runtimeRelevant: !rel.includes('test') && !rel.includes('scripts/sec00') && !rel.includes('evidence'),
      sourcePhase: rel.includes('004') ? '004' : rel.includes('003') ? '003' : rel.includes('002') || rel.includes('securityRecon') ? '002-005' : '002-005'
    };
    if (entry.exists) {
      entry.size = fs.statSync(abs).size;
      entry.sha256 = sha256File(abs);
      entry.tracked = !untracked.includes(rel);
      let headContent = null;
      try { headContent = gitShowHead(rel); } catch (_e) { /* */ }
      if (headContent === null) {
        entry.headComparison = 'UNTRACKED_RUNTIME_FILE';
      } else {
        const headHash = crypto.createHash('sha256').update(headContent).digest('hex');
        entry.headComparison = headHash === entry.sha256 ? 'MATCHES_HEAD' : 'MODIFIED_TRACKED';
        entry.headSha256 = headHash;
      }
    } else {
      entry.headComparison = 'MISSING';
    }
    manifest.push(entry);
  }

  const matchesHead = manifest.filter((m) => m.headComparison === 'MATCHES_HEAD').length;
  const modified = manifest.filter((m) => m.headComparison === 'MODIFIED_TRACKED').length;
  const untrackedManifest = manifest.filter((m) => m.headComparison === 'UNTRACKED_RUNTIME_FILE').length;

  const report = {
    generatedAt: new Date().toISOString(),
    gitHead: head,
    workingTree: {
      statusCount: statusLines.length,
      trackedModified: diffTracked.length,
      untracked: untracked.length,
      byCategory
    },
    securityReconManifest: manifest,
    reconciliation: {
      manifestFiles: manifest.length,
      matchesHead,
      modifiedTracked: modified,
      untrackedRuntimeFiles: untrackedManifest,
      commitRepresentsActiveRuntime: modified === 0 && untrackedManifest === 0 ? 'SIM' : 'NAO',
      modifiedFiles: manifest.filter((m) => m.headComparison === 'MODIFIED_TRACKED').map((m) => m.relativePath),
      untrackedFiles: manifest.filter((m) => m.headComparison === 'UNTRACKED_RUNTIME_FILE').map((m) => m.relativePath)
    },
    moduleResolution: {
      entrypoint: '/var/www/impetus-completa/backend/src/server.js',
      resolvedModules: {}
    }
  };

  process.chdir(path.join(REPO, 'backend'));
  for (const mod of [
    './src/securityRecon/middleware/securityReconMiddleware.js',
    './src/securityRecon/guard/validatedIdentityReconGuard.js',
    './src/securityRecon/engine/postValidationDecision.js',
    './src/securityRecon/engine/scorePolicy.js',
    './src/services/clientIpResolver.js',
    './src/services/edgeTokenCrypto.js'
  ]) {
    try {
      report.moduleResolution.resolvedModules[mod] = require.resolve(mod);
    } catch (e) {
      report.moduleResolution.resolvedModules[mod] = `ERROR: ${e.message}`;
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'runtime-manifest.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, 'SECURITY_RECON_RUNTIME_MANIFEST.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(JSON.stringify({
    head: report.gitHead,
    statusCount: report.workingTree.statusCount,
    byCategory: report.workingTree.byCategory,
    commitRepresentsRuntime: report.reconciliation.commitRepresentsActiveRuntime,
    modifiedInManifest: modified,
    untrackedInManifest: untrackedManifest
  }, null, 2));
}

main();
