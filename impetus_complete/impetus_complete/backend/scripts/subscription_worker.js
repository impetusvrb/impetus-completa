#!/usr/bin/env node
/**
 * Worker Assinaturas - Bloqueio progressivo por inadimplência B2B
 * Dias: 0=vencimento, 3=email, 5=whatsapp, 7=alerta dashboard, 10=bloqueio total
 * Usa subscriptionNotifications (emailService, zapi) e asaasService.checkGracePeriodAndSuspend
 * Uso: node -r dotenv/config scripts/subscription_worker.js
 * Cron: 0 * * * * (a cada hora) ou 0 9 * * * (todo dia às 9h)
 */
require('dotenv').config();
const asaasService = require('../src/services/asaasService');
const subscriptionNotifications = require('../src/services/subscriptionNotifications');

async function run() {
  console.log('[SUB_WORKER] Iniciando verificação de assinaturas em atraso...');

  await subscriptionNotifications.processProgressiveNotifications();
  await asaasService.checkGracePeriodAndSuspend();

  console.log('[SUB_WORKER] Concluído.');
}

run().catch(err => {
  console.error('[SUB_WORKER_ERROR]', err);
  process.exit(1);
});
