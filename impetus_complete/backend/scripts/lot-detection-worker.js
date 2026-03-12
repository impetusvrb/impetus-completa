#!/usr/bin/env node
/**
 * Detecção de Risco em Lotes de Matéria-Prima - Worker
 * Monitora TPM e proposals, detecta padrões, gera alertas, atualiza ranking fornecedores
 * Uso: node -r dotenv/config scripts/lot-detection-worker.js
 * Cron: 0 */4 * * * (a cada 4 horas)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/db');
const lotService = require('../src/services/rawMaterialLotDetectionService');

async function run() {
  console.log('[LOT_DETECTION_WORKER] Iniciando...');
  const r = await db.query(`SELECT id FROM companies WHERE active = true`);
  let totalRisks = 0;
  let totalAlerts = 0;

  for (const row of r.rows || []) {
    try {
      const result = await lotService.runDetectionCycle(row.id);
      totalRisks += result.risks || 0;
      totalAlerts += result.alerts || 0;
    } catch (e) {
      console.warn('[LOT_WORKER] Empresa', row.id, e.message);
    }
  }

  console.log('[LOT_DETECTION_WORKER] Riscos:', totalRisks, 'Alertas:', totalAlerts);
  process.exit(0);
}

run().catch((e) => {
  console.error('[LOT_DETECTION_WORKER]', e);
  process.exit(1);
});
