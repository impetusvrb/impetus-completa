#!/usr/bin/env node
/**
 * Script standalone para executar coleta PLC
 * Uso: node -r dotenv/config scripts/plc_collector.js [company_id]
 * Ou via cron: */5 * * * * cd /path && node -r dotenv/config scripts/plc_collector.js
 */
require('dotenv').config();
const db = require('../src/db');
const { runCollectorCycle } = require('../src/services/plcCollector');

async function main() {
  const companyId = process.argv[2];
  const companies = companyId
    ? [{ id: companyId }]
    : (await db.query('SELECT id FROM companies WHERE active = true')).rows;

  for (const c of companies) {
    try {
      await runCollectorCycle(c.id);
      console.log(`[PLC] Coleta concluída para empresa ${c.id}`);
    } catch (err) {
      console.error(`[PLC] Erro ${c.id}:`, err.message);
    }
  }
  process.exit(0);
}

main();
