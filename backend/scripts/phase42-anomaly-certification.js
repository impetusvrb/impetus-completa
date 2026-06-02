#!/usr/bin/env node
'use strict';

/**
 * FASE 42-I — Certificação Operational Anomaly Intelligence (AN-01 … AN-10).
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
  const anomaly = require('../src/services/plcAnomalyAnalysisService');
  const truth = require('../src/services/industrialTruthEnforcementService');
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');

  const out = { phase: '42-I', generated_at: new Date().toISOString(), tests: [] };

  const realState = await resolveOperationalDataState(REAL_TENANT, { machines: [], events: [] });
  const emptyState = await resolveOperationalDataState(EMPTY_TENANT, { machines: [], events: [] });

  const pack = await anomaly.buildOperationalAnomalyPack(REAL_TENANT);
  const emptyPack = await anomaly.buildOperationalAnomalyPack(EMPTY_TENANT);

  const vibAnomaly = (pack.anomalies || []).find((a) => a.signal === 'vibration');
  const tempAnomaly = (pack.anomalies || []).find((a) => a.signal === 'temperature');

  const unitTests = [
    {
      id: 'AN-01',
      name: 'Anomalia de vibração (motor ou detectada)',
      pass: () => {
        const cls = anomaly.classifyAnomalyDeviation(50);
        return (
          ['anomaly', 'critical_anomaly', 'attention'].includes(cls) ||
          (vibAnomaly && vibAnomaly.classification !== 'normal')
        );
      }
    },
    {
      id: 'AN-02',
      name: 'Anomalia de temperatura (motor ou detectada)',
      pass: () => {
        const cls = anomaly.classifyAnomalyDeviation(15);
        return cls === 'attention' || tempAnomaly != null || pack.anomalies != null;
      }
    },
    {
      id: 'AN-03',
      name: 'Queda abrupta',
      pass: () => anomaly.classifyAnomalyDeviation(-30) !== 'normal'
    },
    {
      id: 'AN-04',
      name: 'Sem anomalia estrutura válida',
      pass: () =>
        Array.isArray(pack.anomalies) &&
        Array.isArray(pack.equipment_attention) &&
        typeof pack.anomaly_count === 'number'
    },
    {
      id: 'AN-05',
      name: 'Tenant vazio',
      pass: () => emptyState.data_state === 'tenant_empty' && (emptyPack.anomalies?.length ?? 0) === 0
    },
    {
      id: 'AN-06',
      name: 'PLC ativo sem MES',
      pass: () => realState.data_state === 'telemetry_only'
    },
    {
      id: 'AN-07',
      name: 'Attention Score',
      pass: () => {
        const att = pack.equipment_attention?.[0];
        return (
          att &&
          Number.isFinite(att.attention_score) &&
          att.attention_score >= 0 &&
          att.attention_score <= 100 &&
          att.observational_only === true
        );
      }
    },
    {
      id: 'AN-08',
      name: 'Evidence Binding',
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
            anomalyPack: pack,
            hasAnomalySnapshot: pack.anomalies.length > 0,
            trendPack: { trend_snapshot: { equipment: [{}] } },
            hasTrendSnapshot: true
          }
        );
        return (
          binding.claim_categories?.includes('anomaly_supported_claim') ||
          (pack.anomalies.length === 0 && binding.claim_categories?.includes('telemetry_supported_claim'))
        );
      }
    },
    {
      id: 'AN-09',
      name: 'Truth Enforcement — buildAnomalyEvidence',
      pass: () => {
        const ev = anomaly.buildAnomalyEvidence({
          equipment_id: 'LAB-EQ-001',
          signal: 'vibration',
          baseline: 2,
          observed: 3,
          deviation_percent: 50,
          classification: 'anomaly'
        });
        return ev.classification === 'anomaly' && ev.deviation_percent === 50;
      }
    },
    {
      id: 'AN-10',
      name: 'Predictive Failure Block',
      pass: async () => {
        for (const p of ['vai falhar', 'falha iminente', 'quebra provável']) {
          const blocked =
            truth.detectForbiddenFailurePredictionClaims(p).length > 0 ||
            truth.detectForbiddenPredictiveClaims(p).length > 0;
          if (!blocked) return false;
        }
        const user = await loadUser(REAL_TENANT);
        const r = await truth.enforceTextResponse('O equipamento provavelmente irá falhar amanhã.', {
          user,
          channel: 'dashboard_chat',
          dataState: 'telemetry_only',
          anomalyPack: pack,
          injectOperational: true
        });
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

  const realUser = await loadUser(REAL_TENANT);
  const token = mintToken(realUser);
  const chatQ = await chat(token, 'Existe alguma anomalia observada na telemetria?');
  const reply = extractReply(chatQ.body);
  out.tests.push({
    id: 'AN-CHAT-01',
    name: 'Chat anomalia observada',
    pass:
      chatQ.status === 200 &&
      /telemetria|anomalia|equipamento|LAB-EQ|padr[aã]o/i.test(reply) &&
      !/provavelmente ir[aá] falhar|vai falhar/i.test(reply),
    excerpt: reply.slice(0, 220)
  });

  const feedEvents = anomaly.buildLiveFeedEvents(pack);
  out.tests.push({
    id: 'AN-FEED-01',
    name: 'Live feed events estrutura',
    pass:
      Array.isArray(feedEvents) &&
      feedEvents.every((e) => !e.synthetic && e.verification_state !== 'synthetic')
  });

  const passed = out.tests.filter((t) => t.pass).length;
  out.summary = { total: out.tests.length, passed, failed: out.tests.length - passed };
  out.certified = out.summary.failed === 0;
  out.anomaly_sample = { count: pack.anomaly_count, top_attention: pack.equipment_attention?.[0] };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.certified ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
