#!/usr/bin/env node
'use strict';

/**
 * Alias legado npm run setup:ativacao — ativação controlada em produção.
 * Delega para controlled-runtime-activation-deploy (dry-run por defeito).
 *
 * Uso:
 *   npm run setup:ativacao              # simulação (dry-run)
 *   npm run setup:ativacao -- --apply   # execução real (cuidado)
 */

const { spawnSync } = require('child_process');
const path = require('path');

const apply = process.argv.includes('--apply');
const args = ['scripts/controlled-runtime-activation-deploy.js'];
if (!apply) args.push('--dry-run');
if (process.argv.includes('--skip-build')) args.push('--skip-build');
if (process.argv.includes('--skip-pm2')) args.push('--skip-pm2');

const result = spawnSync(process.execPath, args, {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
