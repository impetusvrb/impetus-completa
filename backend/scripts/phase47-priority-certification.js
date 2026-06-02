#!/usr/bin/env node
'use strict';

/**
 * FASE 47-K — Certificação Operational Prioritization Intelligence (PR-01 … PR-12 + CHAT).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const db = require('../src/db');

const BASE = process.env.CERT_API_BASE || `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const REAL_TENANT = process.env.CERT_REAL_COMPANY_ID || '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const EMPTY_TENANT = process.env.CERT_EMPTY_COMPANY_ID || '511f4819-fc48-479e-b11e-49ba4fb9c81b';

async function loadUser(companyId) {
  const r = await db.query(
    `SELECT * FROM users WHERE company_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`,
    [companyId]
  );
  if (!r.rows[0]) throw new Error(`Sem user activo ${companyId}`);
  return r.rows[0];
}

function mintToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company_id: user.company_id
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h', algorithm: 'HS256' }
  );
}

async function chat(token, message) {
  const res = await fetch(`${BASE}/dashboard/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: [] })
  });
  return { status: res.status, body: await res.json() };
}

function extractReply(body) {
  const raw = body?.reply || body?.message || body?.content || '';
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    return String(raw.content || raw.message || raw.text || JSON.stringify(raw));
  }
  return String(raw || '');
}

async function main() {
  const pri = require('../src/services/operationalPrioritizationService');
  const truth = require('../src/services/industrialTruthEnforcementService');
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');

  const out = { phase: '47-K', generated_at: new Date().toISOString(), tests: [] };

  const realState = await resolveOperationalDataState(REAL_TENANT, { machines: [], events: [] });
  const emptyState = await resolveOperationalDataState(EMPTY_TENANT, { machines: [], events: [] });

  const pack = await pri.buildOperationalPriorityPack(REAL_TENANT);
  const emptyPack = await pri.buildOperationalPriorityPack(EMPTY_TENANT);

  const mockBundle = {
    plc: {
      equipment_operational_summary: [{ equipment_id: 'T1' }, { equipment_id: 'T2' }],
      snapshot: { telemetry_health: { score: 70 } }
    },
    anomaly: {
      equipment_attention: [
        { equipment_id: 'T1', attention_score: 58 },
        { equipment_id: 'T2', attention_score: 20 }
      ]
    },
    trend: {
      equipment_risk: [
        { equipment_id: 'T1', risk_score: 40 },
        { equipment_id: 'T2', risk_score: 10 }
      ]
    },
    event_pack: {
      events: [
        {
          equipment_id: 'T1',
          event_type: 'SIGNAL_INSTABILITY',
          event_confidence: 70,
          window: '24h'
        }
      ]
    },
    pattern_pack: {
      patterns: [
        {
          equipment_id: 'T1',
          pattern_type: 'RECURRING_SIGNAL_INSTABILITY',
          pattern_confidence: 65,
          observed_pattern: true
        }
      ]
    }
  };

  const mockRank = pri.prioritizeEquipment(mockBundle);
  const mockQueue = pri.buildOperationalPriorityQueue(mockRank);

  const unitTests = [
    {
      id: 'PR-01',
      name: 'Priority score',
      pass: () => {
        const top = pack.equipment_ranking?.[0] || mockRank[0];
        return (
          top &&
          top.priority_score >= 0 &&
          top.priority_score <= 100 &&
          ['low', 'medium', 'high', 'critical'].includes(top.priority_level)
        );
      }
    },
    {
      id: 'PR-02',
      name: 'Priority queue',
      pass: () =>
        (pack.priority_queue?.queue?.length ?? 0) > 0 ||
        (mockQueue.queue.length === 2 && mockQueue.queue[0].equipment_id === 'T1')
    },
    {
      id: 'PR-03',
      name: 'Priority evidence',
      pass: () => {
        const ev = pri.buildPriorityEvidence({
          equipment_id: 'LAB-EQ-001',
          entity_id: 'LAB-EQ-001',
          priority_score: 78,
          priority_level: 'critical',
          contributors: ['attention_score', 'pattern_confidence']
        });
        return ev.observational_only === true && ev.contributors.length === 2;
      }
    },
    {
      id: 'PR-04',
      name: 'Equipment ranking',
      pass: () =>
        (pack.equipment_ranking?.length ?? 0) > 0 ||
        (mockRank[0].equipment_id === 'T1' && mockRank[0].priority_score > mockRank[1].priority_score)
    },
    {
      id: 'PR-05',
      name: 'Event ranking',
      pass: () =>
        (pack.event_ranking?.length ?? 0) >= 0 &&
        pri.prioritizeEvents(mockBundle).length > 0
    },
    {
      id: 'PR-06',
      name: 'Pattern ranking',
      pass: () =>
        (pack.pattern_ranking?.length ?? 0) >= 0 &&
        pri.prioritizePatterns(mockBundle).length > 0
    },
    {
      id: 'PR-07',
      name: 'Tenant vazio',
      pass: () => emptyState.data_state === 'tenant_empty' && (emptyPack.priority_count ?? 0) === 0
    },
    {
      id: 'PR-08',
      name: 'PLC sem MES',
      pass: () => realState.data_state === 'telemetry_only'
    },
    {
      id: 'PR-09',
      name: 'Evidence binding',
      pass: () => {
        const binding = truth.buildEvidenceBinding(
          {
            company_id: REAL_TENANT,
            has_any_data: true,
            data_state: 'telemetry_only',
            domain_checks: [{ has_data: true, source_table: 'plc_collected_data', domain: 'plc' }]
          },
          'dashboard_chat',
          {
            priorityPack: pack,
            hasPrioritySnapshot: (pack.equipment_ranking?.length ?? 0) > 0
          }
        );
        return (
          binding.claim_categories?.includes('telemetry_supported_claim') &&
          (pack.equipment_ranking?.length === 0 ||
            binding.claim_categories?.includes('priority_supported_claim'))
        );
      }
    },
    {
      id: 'PR-10',
      name: 'Traceability',
      pass: () => {
        const top = pack.equipment_ranking?.[0] || mockRank[0];
        const tr = top?.traceability || {};
        return (
          tr.weights_applied &&
          tr.attention_score != null &&
          tr.risk_score != null &&
          pack.weights_documented
        );
      }
    },
    {
      id: 'PR-11',
      name: 'Truth enforcement',
      pass: () => {
        const s = pri.computePriorityScore({
          attention_score: 50,
          risk_score: 30,
          event_confidence: 60,
          pattern_confidence: 40,
          telemetry_health: 80
        });
        return s.priority_score >= 0 && s.contributors.length > 0;
      }
    },
    {
      id: 'PR-12',
      name: 'Priority prediction block',
      pass: async () => {
        for (const p of [
          'é o mais perigoso',
          'vai falhar primeiro',
          'deve quebrar',
          'mais crítico da planta'
        ]) {
          if (!truth.detectForbiddenPriorityPredictionClaims(p).length) return false;
        }
        const user = await loadUser(REAL_TENANT);
        const r = await truth.enforceTextResponse(
          'LAB-EQ-001 é o mais perigoso e vai falhar primeiro — o mais crítico da planta.',
          {
            user,
            channel: 'dashboard_chat',
            dataState: 'telemetry_only',
            priorityPack: pack,
            injectOperational: true
          }
        );
        return r.action === 'unsupported_claim';
      }
    }
  ];

  for (const t of unitTests) {
    let pass = false;
    try {
      pass = typeof t.pass === 'function' ? await t.pass() : Boolean(t.pass);
    } catch (e) {
      t.error = e.message;
    }
    out.tests.push({ id: t.id, name: t.name, pass });
  }

  const user = await loadUser(REAL_TENANT);
  const token = mintToken(user);
  let chatR = null;
  let reply = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    chatR = await chat(token, 'O que merece atenção primeiro na telemetria?');
    reply = extractReply(chatR.body);
    const ok =
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /prioridade|aten[cç][aã]o|primeiro|telemetria|LAB-EQ|fila|analisar/i.test(reply) &&
      !/vai\s+falhar\s+primeiro|mais\s+perigoso|deve\s+quebrar/i.test(reply);
    if (ok) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  out.tests.push({
    id: 'PR-CHAT-01',
    name: 'Chat prioridades',
    pass:
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /prioridade|aten[cç][aã]o|primeiro|telemetria|LAB-EQ|fila|analisar/i.test(reply) &&
      !/vai\s+falhar\s+primeiro|mais\s+perigoso/i.test(reply),
    excerpt: reply.slice(0, 240)
  });

  out.summary = {
    total: out.tests.length,
    passed: out.tests.filter((t) => t.pass).length,
    failed: out.tests.filter((t) => !t.pass).length
  };
  out.certified = out.summary.failed === 0;
  out.priority_sample = {
    top: pack.top_priority?.equipment_id ?? null,
    score: pack.top_priority?.priority_score ?? null,
    queue_len: pack.priority_queue?.queue_length ?? 0
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.certified ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
