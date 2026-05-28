#!/usr/bin/env node
'use strict';

/**
 * node-opcua-debug depende de hexy@0.4 (ESM); IMPETUS usa CommonJS.
 * Garante hexy@0.3.4 dentro de node-opcua-debug após npm install.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, '../node_modules/node-opcua-debug');
if (!fs.existsSync(targetDir)) {
  process.exit(0);
}

const hexyPkg = path.join(targetDir, 'node_modules/hexy/package.json');
let version = null;
try {
  version = JSON.parse(fs.readFileSync(hexyPkg, 'utf8')).version;
} catch {
  version = null;
}

if (version === '0.3.4') {
  process.exit(0);
}

try {
  const nested = path.join(targetDir, 'node_modules/hexy');
  if (fs.existsSync(nested)) fs.rmSync(nested, { recursive: true, force: true });
  execSync('npm install hexy@0.3.4 --no-save --prefix node_modules/node-opcua-debug', {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
  });
  console.log('[fix-opcua-hexy] hexy@0.3.4 aplicado em node-opcua-debug');
} catch (err) {
  console.warn('[fix-opcua-hexy]', err?.message || err);
  process.exit(0);
}
