#!/usr/bin/env node
'use strict';

/** Verificação Enterprise — paths, manifest, permissões. CERT-ONPREM-DATA-01 */

require('../../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const home = require('../../src/config/impetusHome');

let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    console.log('  OK', label, detail ? `— ${detail}` : '');
  } else {
    console.log('  FAIL', label, detail ? `— ${detail}` : '');
    failed++;
  }
}

console.log('=== verify-enterprise ===');
home.ensureEnterpriseDirs();
const layout = home.describeLayout();
console.log(JSON.stringify(layout, null, 2));

check('uploads dir', fs.existsSync(layout.uploads_dir), layout.uploads_dir);
check('data dir', fs.existsSync(layout.data_dir), layout.data_dir);
check('env file', fs.existsSync(layout.env_file) || fs.existsSync(home.legacyEnvFilePath()), layout.env_file);

home.ensureDataSubdirs();
for (const sub of home.COGNITIVE_DATA_SUBDIRS) {
  const p = home.dataSubdir(sub);
  check(`data/${sub}`, fs.existsSync(p), p);
}

if (process.argv.includes('--backup')) {
  const lib = require('./backup-lib');
  const dir = process.argv[process.argv.indexOf('--backup') + 1];
  try {
    lib.validateManifest(dir, { strict: true });
    check('backup manifest', true, dir);
  } catch (e) {
    check('backup manifest', false, e.message);
  }
}

console.log(failed ? `\n${failed} verificação(ões) falharam.` : '\nTodas as verificações passaram.');
process.exit(failed ? 1 : 0);
