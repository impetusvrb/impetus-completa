#!/usr/bin/env node
/**
 * IMPETUS - Exemplo de Agente Edge
 * Coleta dados localmente (Modbus/sensores) e envia em batch para o servidor central
 * Uso: node scripts/edge-agent-example.js
 * Configure: EDGE_ID, IMPETUS_URL, COMPANY_ID no .env
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

const EDGE_ID = process.env.EDGE_ID || 'edge-fabrica-01';
const IMPETUS_URL = process.env.IMPETUS_URL || process.env.API_URL || 'http://localhost:3000';
const COMPANY_ID = process.env.EDGE_COMPANY_ID || process.env.COMPANY_ID;
/** Obrigatório após registo em POST /api/integrations/edge/register (mesmo valor devolvido). */
const TOKEN = process.env.EDGE_TOKEN;

if (!COMPANY_ID) {
  console.warn('[EDGE_AGENT] EDGE_COMPANY_ID ou COMPANY_ID não definido. Use como exemplo.');
}

async function collectLocalReadings() {
  // Simulação: em produção, ler de Modbus/OPC UA/sensores locais
  const now = new Date().toISOString();
  return [
    { machine_identifier: 'EQ-001', temperature: 52.1, vibration: 1.2, status: 'running', timestamp: now },
    { machine_identifier: 'EQ-002', temperature: 48.3, vibration: 0.9, status: 'running', timestamp: now }
  ];
}

async function sendToCentral(readings) {
  const url = `${IMPETUS_URL.replace(/\/$/, '')}/api/integrations/edge/ingest`;
  const payload = {
    edge_id: EDGE_ID,
    company_id: COMPANY_ID,
    token: TOKEN,
    readings
  };

  const res = await axios.post(url, payload, {
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });

  return res.data;
}

async function run() {
  if (!COMPANY_ID) {
    console.log('Configure EDGE_COMPANY_ID no .env e execute novamente.');
    process.exit(0);
    return;
  }

  try {
    const readings = await collectLocalReadings();
    const result = await sendToCentral(readings);
    console.log('[EDGE_AGENT] Enviados:', result?.processed || 0);
  } catch (err) {
    console.error('[EDGE_AGENT] Erro:', err?.response?.data || err?.message);
    process.exit(1);
  }
}

run();
