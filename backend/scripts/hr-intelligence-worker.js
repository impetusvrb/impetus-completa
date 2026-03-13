#!/usr/bin/env node
/**
 * Inteligência de RH - Worker agendável
 * 1) Sincroniza registros de ponto (integrações configuradas)
 * 2) Calcula indicadores e gera alertas
 * Uso: node -r dotenv/config scripts/hr-intelligence-worker.js
 * Agendar com cron: 0 */1 * * * (a cada hora)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/db');
const timeClock = require('../src/services/timeClockIntegrationService');
const hrIntelligence = require('../src/services/hrIntelligenceService');

async function runSyncAll() {
  const r = await db.query(`
    SELECT company_id, system_code FROM time_clock_integrations WHERE enabled = true
  `);
  let synced = 0;
  for (const row of r.rows || []) {
    try {
      const res = await timeClock.runSync(row.company_id, row.system_code);
      if (res.ok) synced += res.synced || 0;
    } catch (e) {
      console.warn('[HR_WORKER] Sync falhou empresa', row.company_id, e.message);
    }
  }
  return synced;
}

async function runIndicatorsAndAlerts() {
  const r = await db.query(`SELECT id FROM companies WHERE active = true`);
  let processed = 0;
  for (const row of r.rows || []) {
    try {
      await hrIntelligence.calculateIndicators(row.id, 30);
      const alerts = await hrIntelligence.detectAndCreateAlerts(row.id);
      if (alerts?.length) processed += alerts.length;
    } catch (e) {
      console.warn('[HR_WORKER] Indicadores/alertas falharam empresa', row.id, e.message);
    }
  }
  return processed;
}

async function run() {
  console.log('[HR_INTELLIGENCE_WORKER] Iniciando...');
  const synced = await runSyncAll();
  console.log('[HR_INTELLIGENCE_WORKER] Sincronização: registros importados');
  const alerts = await runIndicatorsAndAlerts();
  console.log('[HR_INTELLIGENCE_WORKER] Indicadores e alertas processados');
  process.exit(0);
}

run().catch((e) => {
  console.error('[HR_INTELLIGENCE_WORKER]', e);
  process.exit(1);
});
