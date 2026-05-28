#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV = path.join(__dirname, '../.env');

function log(m) { console.log(`[MFA_PROMOTION] ${m}`); }

function validate() {
  const c = fs.readFileSync(ENV, 'utf8');
  if (!/IMPETUS_MFA_ENABLED=true/.test(c)) throw new Error('IMPETUS_MFA_ENABLED deve ser true');
  if (!/IMPETUS_MFA_MODE=audit/.test(c)) throw new Error('IMPETUS_MFA_MODE deve ser audit');
  log('.env OK');
}

async function main() {
  validate();
  execSync('pm2 restart impetus-backend --update-env', { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 6000));
  execSync('node scripts/verify-mfa-evidence.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  log('Concluído');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
