#!/usr/bin/env node
/**
 * IMPETUS - Worker de Inteligência de Almoxarifado
 * Executa detecção de alertas, previsões e snapshots
 * Uso: node -r dotenv/config scripts/warehouse-intelligence-worker.js
 * Cron sugerido: a cada 6 horas
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/db');
const warehouseIntel = require('../src/services/warehouseIntelligenceService');

async function run() {
  console.log('[WAREHOUSE_INTEL_WORKER] Iniciando ciclo...');
  try {
    const r = await db.query(`SELECT id FROM companies WHERE active = true`);
    const companies = r.rows || [];
    let totalAlerts = 0;
    for (const c of companies) {
      try {
        const alerts = await warehouseIntel.detectAndCreateWarehouseAlerts(c.id);
        await warehouseIntel.savePredictionsSnapshot(c.id);
        totalAlerts += alerts.length;
      } catch (err) {
        console.error(`[WAREHOUSE_INTEL_WORKER] Empresa ${c.id}:`, err.message);
      }
    }
    console.log(`[WAREHOUSE_INTEL_WORKER] Concluído. ${totalAlerts} alertas criados para ${companies.length} empresa(s).`);
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_WORKER] Erro:', err);
    process.exit(1);
  }
  process.exit(0);
}

run();
