#!/usr/bin/env node
/**
 * Rollback - Remove APENAS a camada operacional de manutenção do banco
 * Tabelas removidas: shift_technical_logs, equipment_failures, technical_interventions,
 *   maintenance_preventives, work_orders, monitored_points
 * 
 * Uso: node -r dotenv/config scripts/rollback-maintenance-operational.js
 */
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/db');

const ROLLBACK_SQL = path.join(__dirname, '../src/models/rollback_maintenance_operational.sql');

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Rollback: Camada Operacional de Manutenção');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(ROLLBACK_SQL)) {
    console.error('Arquivo não encontrado:', ROLLBACK_SQL);
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync(ROLLBACK_SQL, 'utf8');
    await db.query(sql);
    console.log('✓ Tabelas da camada de manutenção removidas com sucesso.');
    console.log('  (monitored_points, work_orders, maintenance_preventives,');
    console.log('   technical_interventions, equipment_failures, shift_technical_logs)\n');
  } catch (err) {
    console.error('✗ Erro ao executar rollback:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

run();
