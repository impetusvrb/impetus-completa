#!/usr/bin/env node
'use strict';

/** Pré-update — valida ambiente antes de actualização. CERT-ONPREM-DATA-01 */

require('../../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const home = require('../../src/config/impetusHome');

let failed = 0;
const fail = (msg) => {
  console.error('[update-precheck] FAIL:', msg);
  failed++;
};
const ok = (msg) => console.log('[update-precheck] OK:', msg);

console.log('=== update-precheck ===');

try {
  require('../../src/config/configValidator').validateConfigOrThrow();
  ok('configValidator');
} catch (e) {
  fail(e.message || String(e));
}

if (!fs.existsSync(home.envFilePath())) fail(`env em falta: ${home.envFilePath()}`);
else ok('env file');

try {
  execSync('node scripts/run-all-migrations.js --status', {
    cwd: path.join(__dirname, '../..'),
    stdio: 'pipe',
  });
  ok('migration status');
} catch (e) {
  fail('migration status — ' + (e.stderr?.toString() || e.message));
}

const diskPaths = [home.uploadsDir(), home.dataDir(), home.backupsDir()];
for (const p of diskPaths) {
  try {
    fs.accessSync(p, fs.constants.W_OK);
    ok(`writable ${p}`);
  } catch {
    fail(`sem escrita ${p}`);
  }
}

console.log(failed ? `\nPrecheck FALHOU (${failed})` : '\nPrecheck OK — pode proceder backup + update');
process.exit(failed ? 1 : 0);
