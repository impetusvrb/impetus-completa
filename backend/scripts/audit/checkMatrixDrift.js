#!/usr/bin/env node
/**
 * IMPETUS CERT — Anti-drift da Matriz Funcional (Parte 9 do manual).
 *
 * Compara o código atual com FUNCTIONAL_MATRIX.json commitado.
 * Falha (--fail-on-drift) se houver divergência não commitada.
 *
 * Uso:
 *   node backend/scripts/audit/checkMatrixDrift.js
 *   node backend/scripts/audit/checkMatrixDrift.js --fail-on-drift
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MATRIX_PATH = path.join(REPO_ROOT, 'backend', 'docs', 'FUNCTIONAL_MATRIX.json');
const FE_INV = path.join(REPO_ROOT, 'backend', 'docs', 'inventory', 'FRONTEND_INVENTORY.json');
const BE_INV = path.join(REPO_ROOT, 'backend', 'docs', 'inventory', 'BACKEND_INVENTORY.json');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'backend', 'scripts', 'audit', 'buildFunctionalMatrix.js');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function routeKey(r) {
  return `${r.module}|${r.screen}|${r.route}`;
}

function endpointKey(ep) {
  return `${ep.method}|${ep.path}`;
}

function diffSets(committed, fresh, keyFn) {
  const cSet = new Set(committed.map(keyFn));
  const fSet = new Set(fresh.map(keyFn));
  const orphanInCode = [...fSet].filter((k) => !cSet.has(k));
  const obsoleteInMatrix = [...cSet].filter((k) => !fSet.has(k));
  return { orphanInCode, obsoleteInMatrix };
}

function main() {
  const failOnDrift = process.argv.includes('--fail-on-drift');

  if (!fs.existsSync(MATRIX_PATH)) {
    console.error('FUNCTIONAL_MATRIX.json não encontrado. Rode buildFunctionalMatrix.js primeiro.');
    process.exit(failOnDrift ? 1 : 0);
  }

  const committed = readJson(MATRIX_PATH);
  const committedFe = fs.existsSync(FE_INV) ? readJson(FE_INV) : null;
  const committedBe = fs.existsSync(BE_INV) ? readJson(BE_INV) : null;

  // Regenera em memória via build script (sobrescreve arquivos — ok para drift check)
  execSync(`node "${BUILD_SCRIPT}" --json`, { cwd: REPO_ROOT, stdio: 'pipe' });

  const fresh = readJson(MATRIX_PATH);
  const freshFe = readJson(FE_INV);
  const freshBe = readJson(BE_INV);

  const screenDrift = diffSets(committed.rows || [], fresh.rows || [], routeKey);
  const endpointDrift = diffSets(
    committedBe?.endpoints || committedBe?.items || [],
    freshBe?.endpoints || freshBe?.items || [],
    endpointKey
  );

  const statsChanged = JSON.stringify(committed.stats) !== JSON.stringify(fresh.stats);

  const report = {
    ok: screenDrift.orphanInCode.length === 0 &&
        screenDrift.obsoleteInMatrix.length === 0 &&
        endpointDrift.orphanInCode.length === 0 &&
        endpointDrift.obsoleteInMatrix.length === 0 &&
        !statsChanged,
    committedAt: committed.generatedAt,
    freshAt: fresh.generatedAt,
    stats: { committed: committed.stats, fresh: fresh.stats, changed: statsChanged },
    screens: {
      orphanInCode: screenDrift.orphanInCode.length,
      obsoleteInMatrix: screenDrift.obsoleteInMatrix.length,
      samples: {
        orphan: screenDrift.orphanInCode.slice(0, 10),
        obsolete: screenDrift.obsoleteInMatrix.slice(0, 10)
      }
    },
    endpoints: {
      orphanInCode: endpointDrift.orphanInCode.length,
      obsoleteInMatrix: endpointDrift.obsoleteInMatrix.length
    },
    unvalidatedScreens: (fresh.rows || []).filter((r) => r.status === 'NAO_VALIDADO').length,
    evidenceRequired: (fresh.rows || []).filter((r) => r.status === 'VERDE' && !r.evidence).length
  };

  console.log(JSON.stringify(report, null, 2));

  if (failOnDrift && !report.ok) {
    console.error('\nDRIFT DETECTADO — atualize FUNCTIONAL_MATRIX.json (buildFunctionalMatrix.js) e commite.');
    process.exit(1);
  }
}

main();
