#!/usr/bin/env node
'use strict';

/**
 * Regista agente edge piloto na BD e grava token em .env.edge-agent (mesmo host).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const PILOT = process.env.IMPETUS_EDGE_RUNTIME_PILOT_TENANTS?.split(',')[0]
  || '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const EDGE_ID = process.env.IMPETUS_EDGE_AGENT_ID || 'impetus-lab-edge-01';

async function ensureEdgeAgentsSchema() {
  await db.query(`
    ALTER TABLE edge_agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  `).catch(() => {});
  const sql = fs.readFileSync(
    path.join(__dirname, '../src/models/lacunas_ind4_migration.sql'),
    'utf8'
  );
  const chunk = sql.split('-- Edge agents')[1] || '';
  if (chunk.includes('edge_agents')) {
    await db.query(`CREATE TABLE IF NOT EXISTS edge_agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      edge_id TEXT NOT NULL,
      name TEXT,
      token_hash TEXT,
      enabled BOOLEAN DEFAULT true,
      last_seen_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (company_id, edge_id)
    )`);
  }
}

async function main() {
  await ensureEdgeAgentsSchema();
  const edgeIngest = require('../src/services/edgeIngestService');
  const r = await edgeIngest.registerEdgeAgent(PILOT, {
    edge_id: EDGE_ID,
    name: 'IMPETUS Lab Edge (same host)',
  });

  const envPath = path.join(__dirname, '../.env.edge-agent');
  const lines = [
    `# Gerado por register-pilot-edge-agent.js — mesmo host`,
    `IMPETUS_EDGE_AGENT_ID=${EDGE_ID}`,
    `IMPETUS_EDGE_AGENT_COMPANY_ID=${PILOT}`,
    `IMPETUS_EDGE_AGENT_TOKEN=${r.token}`,
    `IMPETUS_EDGE_AGENT_API_URL=http://127.0.0.1:4000`,
    `IMPETUS_EDGE_AGENT_INTERVAL_MS=10000`,
  ];
  fs.writeFileSync(envPath, `${lines.join('\n')}\n`);

  const mainEnv = path.join(__dirname, '../.env');
  let content = fs.readFileSync(mainEnv, 'utf8');
  const inject = [
    `IMPETUS_EDGE_AGENT_ID=${EDGE_ID}`,
    `IMPETUS_EDGE_AGENT_TOKEN=${r.token}`,
    `IMPETUS_EDGE_AGENT_COMPANY_ID=${PILOT}`,
    `IMPETUS_EDGE_AGENT_API_URL=http://127.0.0.1:4000`,
  ];
  for (const line of inject) {
    const key = line.split('=')[0];
    if (content.includes(`${key}=`)) {
      content = content.replace(new RegExp(`${key}=.*`, 'g'), line);
    } else {
      content += `\n${line}`;
    }
  }
  fs.writeFileSync(mainEnv, content);

  console.log(JSON.stringify({
    ok: true,
    edge_id: r.edge_id,
    token_saved: true,
    env_edge_agent: envPath,
    note: 'Token mostrado uma vez; já em .env e .env.edge-agent',
  }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
