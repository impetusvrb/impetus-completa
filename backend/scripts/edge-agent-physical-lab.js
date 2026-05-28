#!/usr/bin/env node
'use strict';

/**
 * Agente edge físico (lab) — mesmo host 127.0.0.1
 * Lê Modbus local, publica MQTT, envia ingest edge + fila telemetria.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const ModbusRTU = require('modbus-serial');
const mqtt = require('mqtt');

const PILOT = process.env.IMPETUS_EDGE_AGENT_COMPANY_ID
  || process.env.IMPETUS_MQTT_REAL_PILOT_TENANTS?.split(',')[0]
  || '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const EDGE_ID = process.env.IMPETUS_EDGE_AGENT_ID || 'impetus-lab-edge-01';
const TOKEN = process.env.IMPETUS_EDGE_AGENT_TOKEN;
const API = (process.env.IMPETUS_EDGE_AGENT_API_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const INTERVAL_MS = parseInt(process.env.IMPETUS_EDGE_AGENT_INTERVAL_MS || '10000', 10);

async function readModbus() {
  const client = new ModbusRTU();
  client.setTimeout(5000);
  await client.connectTCP(process.env.IMPETUS_MODBUS_HOST || '127.0.0.1', {
    port: parseInt(process.env.IMPETUS_MODBUS_PORT || '502', 10),
  });
  client.setID(parseInt(process.env.IMPETUS_MODBUS_UNIT_ID || '1', 10));
  const r = await client.readHoldingRegisters(0, 2);
  client.close(() => {});
  return { reg0: r.data[0], reg1: r.data[1] };
}

async function publishMqtt(sample) {
  const url = process.env.IMPETUS_MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
  return new Promise((resolve, reject) => {
    const c = mqtt.connect(url, { clientId: `edge-lab-${EDGE_ID.slice(0, 8)}` });
    c.on('connect', () => {
      c.publish('impetus/telemetry/edge', JSON.stringify(sample), { qos: 1 }, (err) => {
        c.end(true, () => (err ? reject(err) : resolve()));
      });
    });
    c.on('error', reject);
  });
}

async function postEdgeIngest(readings) {
  if (!TOKEN) return { skipped: true, reason: 'no_token' };
  const axios = require('axios');
  const res = await axios.post(`${API}/api/integrations/edge/ingest`, {
    edge_id: EDGE_ID,
    company_id: PILOT,
    token: TOKEN,
    readings,
  }, { timeout: 15000 });
  return res.data;
}

async function enqueueTelemetry(sample) {
  const axios = require('axios');
  try {
    await axios.post(`${API}/api/environment-telemetry/edge/enqueue`, {
      edge_sequence: String(Date.now()),
      idempotency_key: `edge-lab-${Date.now()}`,
      connector_source: 'mqtt',
      topic: 'impetus/telemetry/edge',
      ...sample,
    }, {
      timeout: 10000,
      headers: { 'X-Lab-Agent': '1' },
    });
  } catch {
    /* endpoint requer auth — ingest edge é canal principal */
  }
}

async function tick() {
  const regs = await readModbus();
  const sample = {
    value: regs.reg0,
    unit: 'C',
    metric_key: 'edge.lab.temp',
    telemetry_type: 'edge_lab',
    recorded_at: new Date().toISOString(),
    labels: { edge_id: EDGE_ID, reg1: String(regs.reg1) },
  };
  await publishMqtt(sample).catch((e) => console.warn('[EDGE_AGENT] mqtt', e?.message));
  const readings = [{
    machine_identifier: 'LAB-EQ-001',
    temperature: regs.reg0 / 10,
    vibration: regs.reg1 / 100,
    status: 'running',
    timestamp: sample.recorded_at,
  }];
  const ingest = await postEdgeIngest(readings).catch((e) => {
    console.warn('[EDGE_AGENT] ingest', e?.message);
    return { ok: false };
  });
  await enqueueTelemetry(sample).catch(() => {});
  console.log(`[EDGE_AGENT] tick ok=${ingest?.ok !== false} reg0=${regs.reg0} reg1=${regs.reg1}`);
}

async function main() {
  console.log(`[EDGE_AGENT] Lab edge ${EDGE_ID} → ${API} tenant=${PILOT}`);
  if (!TOKEN) {
    console.warn('[EDGE_AGENT] IMPETUS_EDGE_AGENT_TOKEN ausente — execute register-pilot-edge-agent.js');
  }
  await tick();
  setInterval(() => tick().catch((e) => console.warn('[EDGE_AGENT]', e?.message)), INTERVAL_MS);
}

main().catch((e) => {
  console.error('[EDGE_AGENT] Falha fatal:', e?.message);
  process.exit(1);
});
