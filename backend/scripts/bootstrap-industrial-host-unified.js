#!/usr/bin/env node
'use strict';

/**
 * Bootstrap lab industrial no MESMO host — Mosquitto (systemd) + Modbus/OPC-UA/agent (PM2).
 */
const { execSync } = require('child_process');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: BACKEND, ...opts });
}

async function main() {
  console.log('[BOOTSTRAP] Host unificado 127.0.0.1');

  try {
    execSync('systemctl is-active mosquitto', { stdio: 'pipe' });
    console.log('[BOOTSTRAP] Mosquitto já activo (systemd)');
  } catch {
    console.log('[BOOTSTRAP] A iniciar Mosquitto...');
    execSync('systemctl enable mosquitto && systemctl start mosquitto', { stdio: 'inherit', shell: true });
  }

  run('node scripts/fix-opcua-hexy-cjs.js');
  const pki = require('os').homedir() + '/.config/node-opcua-default-nodejs/PKI';
  try {
    require('fs').rmSync(pki, { recursive: true, force: true });
    console.log('[BOOTSTRAP] PKI OPC-UA regenerado (lab same-host)');
  } catch { /* ok */ }
  run('pm2 start ecosystem.industrial-lab.config.js --update-env || pm2 restart ecosystem.industrial-lab.config.js --update-env');
  run('node scripts/register-pilot-edge-agent.js');
  run('node scripts/run-industrial-lab-e2e.js');

  console.log('[BOOTSTRAP] Reiniciar backend...');
  execSync('pm2 restart impetus-backend --update-env', { stdio: 'inherit' });

  await new Promise((r) => setTimeout(r, 12000));
  run('node scripts/verify-industrial-lab-e2e.js');
  console.log('[BOOTSTRAP] Concluído');
}

main().catch((e) => {
  console.error('[BOOTSTRAP] Falha:', e.message);
  process.exit(1);
});
