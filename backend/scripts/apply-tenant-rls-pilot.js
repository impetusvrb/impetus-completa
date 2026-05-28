#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV = path.join(__dirname, '../.env');

function log(m) { console.log(`[TENANT_RLS_PROMOTION] ${m}`); }

function validate() {
  const c = fs.readFileSync(ENV, 'utf8');
  if (!/IMPETUS_RLS_ENABLED=true/.test(c)) throw new Error('IMPETUS_RLS_ENABLED deve ser true');
  if (!/IMPETUS_RLS_MODE=audit/.test(c)) throw new Error('IMPETUS_RLS_MODE deve ser audit');
  log('.env OK');
}

async function main() {
  validate();
  execSync('pm2 restart impetus-backend --update-env', { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 7000));
  execSync('node scripts/verify-tenant-rls-evidence.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  log('Concluído');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
