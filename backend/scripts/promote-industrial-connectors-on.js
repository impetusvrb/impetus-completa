#!/usr/bin/env node
'use strict';

/**
 * Promove conectores industriais de audit → on (piloto).
 * Default: MQTT + Edge. Use --all para OPC-UA e Modbus também.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV_PATH = path.join(__dirname, '../.env');
const promoteAll = process.argv.includes('--all') || process.argv.includes('--full');

const REPLACEMENTS = [
  ['IMPETUS_MQTT_REAL_MODE=audit', 'IMPETUS_MQTT_REAL_MODE=on'],
  ['IMPETUS_MQTT_REAL_MODE=shadow', 'IMPETUS_MQTT_REAL_MODE=on'],
  ['IMPETUS_EDGE_RUNTIME_MODE=audit', 'IMPETUS_EDGE_RUNTIME_MODE=on'],
  ['IMPETUS_EDGE_RUNTIME_MODE=shadow', 'IMPETUS_EDGE_RUNTIME_MODE=on'],
];

REPLACEMENTS.push(
  ['IMPETUS_OPCUA_REAL_MODE=audit', 'IMPETUS_OPCUA_REAL_MODE=on'],
  ['IMPETUS_OPCUA_REAL_MODE=shadow', 'IMPETUS_OPCUA_REAL_MODE=on'],
  ['IMPETUS_MODBUS_REAL_MODE=audit', 'IMPETUS_MODBUS_REAL_MODE=on'],
  ['IMPETUS_MODBUS_REAL_MODE=shadow', 'IMPETUS_MODBUS_REAL_MODE=on']
);

function log(msg) {
  console.log(`[INDUSTRIAL_PROMOTION] ${msg}`);
}

function applyEnv() {
  let content = fs.readFileSync(ENV_PATH, 'utf8');
  for (const [from, to] of REPLACEMENTS) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      log(`${from} → ${to}`);
    }
  }
  if (!/IMPETUS_MQTT_REAL_MODE=on/.test(content)) {
    throw new Error('IMPETUS_MQTT_REAL_MODE=on não encontrado após promoção');
  }
  fs.writeFileSync(ENV_PATH, content);
  log('.env atualizado');
}

async function main() {
  log(`Início (all=${promoteAll})`);
  applyEnv();
  log('pm2 restart impetus-backend --update-env');
  execSync('pm2 restart impetus-backend --update-env', { stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 8000));
  for (const script of [
    'verify-mqtt-real-evidence.js',
    'verify-modbus-real-evidence.js',
    'verify-opcua-real-evidence.js',
    'verify-edge-runtime-evidence.js',
  ]) {
    execSync(`node scripts/${script}`, { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  }
  execSync('node scripts/run-industrial-lab-e2e.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  log('Promoção concluída — MQTT/Edge em modo on');
}

main().catch((e) => {
  console.error(`[INDUSTRIAL_PROMOTION] Falha: ${e.message}`);
  process.exit(1);
});
