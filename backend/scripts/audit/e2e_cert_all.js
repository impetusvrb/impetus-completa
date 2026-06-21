#!/usr/bin/env node
/**
 * CERT Parte 7.2 — Runner completo (10 cenários)
 * Quality + SST + 8 domínios batch
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const scripts = [
  'scripts/audit/e2e_quality_nc_capa.js',
  'scripts/audit/e2e_sst_lifecycle.js',
  'scripts/audit/e2e_cert_part72_batch.js',
  'scripts/audit/applyCertEvidenceToMatrix.js'
];

let failed = false;
for (const s of scripts) {
  console.log('\n>>>', s);
  try {
    execSync(`node ${s}`, { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    failed = true;
    console.error('FAILED:', s);
  }
}

process.exit(failed ? 1 : 0);
