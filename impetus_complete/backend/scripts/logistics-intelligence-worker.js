#!/usr/bin/env node
/**
 * IMPETUS - Worker de Inteligência Logística
 * Executa detecção de alertas, snapshots e previsões
 * Uso: node -r dotenv/config scripts/logistics-intelligence-worker.js
 * Cron sugerido: a cada 6 horas
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/db');
const logisticsIntel = require('../src/services/logisticsIntelligenceService');

async function run() {
  console.log('[LOGISTICS_INTEL_WORKER] Iniciando ciclo...');
  try {
    const r = await db.query(`SELECT id FROM companies WHERE active = true`);
    const companies = r.rows || [];
    let totalAlerts = 0;
    for (const c of companies) {
      try {
        const alerts = await logisticsIntel.detectAndCreateLogisticsAlerts(c.id);
        totalAlerts += alerts.length;
      } catch (err) {
        console.error(`[LOGISTICS_INTEL_WORKER] Empresa ${c.id}:`, err.message);
      }
    }
    console.log(`[LOGISTICS_INTEL_WORKER] Concluído. ${totalAlerts} alertas criados para ${companies.length} empresa(s).`);
  } catch (err) {
    console.error('[LOGISTICS_INTEL_WORKER] Erro:', err);
    process.exit(1);
  }
  process.exit(0);
}

run();
