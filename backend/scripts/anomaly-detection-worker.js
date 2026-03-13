#!/usr/bin/env node
/**
 * Detecção de Anomalias Operacionais - Worker agendável
 * Aprende baselines, detecta anomalias, analisa causas, distribui alertas
 * Uso: node -r dotenv/config scripts/anomaly-detection-worker.js
 * Agendar com cron: 0 */2 * * * (a cada 2 horas)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/db');
const anomalyService = require('../src/services/operationalAnomalyDetectionService');

async function run() {
  console.log('[ANOMALY_DETECTION_WORKER] Iniciando...');
  const r = await db.query(`SELECT id FROM companies WHERE active = true`);
  let totalDetected = 0;
  let totalRecorded = 0;

  for (const row of r.rows || []) {
    try {
      const result = await anomalyService.runDetectionCycle(row.id);
      totalDetected += result.detected || 0;
      totalRecorded += result.recorded || 0;
    } catch (e) {
      console.warn('[ANOMALY_WORKER] Empresa', row.id, e.message);
    }
  }

  console.log('[ANOMALY_DETECTION_WORKER] Detectadas:', totalDetected, 'Registradas:', totalRecorded);
  process.exit(0);
}

run().catch((e) => {
  console.error('[ANOMALY_DETECTION_WORKER]', e);
  process.exit(1);
});
