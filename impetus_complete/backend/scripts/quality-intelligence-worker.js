#!/usr/bin/env node
/**
 * Inteligência de Qualidade - Worker
 * Detecta padrões, gera alertas, atualiza indicadores
 * Uso: node -r dotenv/config scripts/quality-intelligence-worker.js
 * Cron: 0 */6 * * * (a cada 6 horas)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/db');
const qualityService = require('../services/qualityIntelligenceService');

async function run() {
  console.log('[QUALITY_INTELLIGENCE_WORKER] Iniciando...');
  const r = await db.query(`SELECT id FROM companies WHERE active = true`);
  let total = 0;

  for (const row of r.rows || []) {
    try {
      const alerts = await qualityService.detectAndCreateQualityAlerts(row.id);
      total += alerts.length;
    } catch (e) {
      console.warn('[QUALITY_WORKER] Empresa', row.id, e.message);
    }
  }

  console.log('[QUALITY_INTELLIGENCE_WORKER] Alertas criados:', total);
  process.exit(0);
}

run().catch((e) => {
  console.error('[QUALITY_INTELLIGENCE_WORKER]', e);
  process.exit(1);
});
