#!/usr/bin/env node
/**
 * IA Proativa - Worker agendável
 * Executa: detecção de padrão de falhas, lembrete de eventos incompletos
 * Uso: node -r dotenv/config scripts/proactive-ai-worker.js
 * Agendar com cron: */30 * * * * (a cada 30 min)
 */
require('dotenv').config();
const proactiveAI = require('../src/jobs/proactiveAI');

async function run() {
  console.log('[PROACTIVE_AI] Iniciando...');
  const r1 = await proactiveAI.runFailurePatternCheck();
  console.log('[PROACTIVE_AI] Padrão falhas:', r1.ok ? 'OK' : r1.error);
  const r2 = await proactiveAI.remindIncompleteEvents();
  console.log('[PROACTIVE_AI] Lembretes:', r2.ok ? 'OK' : 'erro');
  process.exit(0);
}

run().catch((e) => {
  console.error('[PROACTIVE_AI]', e);
  process.exit(1);
});
