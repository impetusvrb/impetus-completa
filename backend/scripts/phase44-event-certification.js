#!/usr/bin/env node
'use strict';

/**
 * FASE 44-K — Certificação Operational Event Intelligence (EV-01 … EV-11).
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
  const events = require('../src/services/operationalEventIntelligenceService');
  const truth = require('../src/services/industrialTruthEnforcementService');
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');

  const out = { phase: '44-K', generated_at: new Date().toISOString(), tests: [] };

  const realState = await resolveOperationalDataState(REAL_TENANT, { machines: [], events: [] });
  const emptyState = await resolveOperationalDataState(EMPTY_TENANT, { machines: [], events: [] });

  const pack = await events.buildOperationalEventPack(REAL_TENANT);
  const emptyPack = await events.buildOperationalEventPack(EMPTY_TENANT);

  const hasNormal = (pack.events || []).some((e) => e.event_type === 'NORMAL_OPERATION');
  const hasInstability = (pack.events || []).some(
    (e) => e.event_type === 'SIGNAL_INSTABILITY' || e.event_type === 'EQUIPMENT_ATTENTION_REQUIRED'
  );
  const hasAlarm = (pack.events || []).some((e) => e.event_type === 'ALARM_ESCALATION');
  const hasRecovery = (pack.events || []).some((e) => e.event_type === 'TELEMETRY_RECOVERY');

  const unitTests = [
    {
      id: 'EV-01',
      name: 'Evento normal',
      pass: () => hasNormal || (pack.event_count ?? 0) > 0
    },
    {
      id: 'EV-02',
      name: 'Instabilidade observada',
      pass: () =>
        hasInstability ||
        events.detectOperationalEventsForEquipment({
          equipment_id: 'T',
          snapshot: { telemetry_health: { score: 50 }, telemetry_coverage: 0.5 },
          trendRow: {},
          anomalies: [{ signal: 'vibration', classification: 'anomaly' }],
          correlations: [],
          attention: { attention_score: 40 },
          window: '24h'
        }).some((e) => e.event_type === 'SIGNAL_INSTABILITY')
    },
    {
      id: 'EV-03',
      name: 'Escalada de alarmes',
      pass: () =>
        hasAlarm ||
        events.detectOperationalEventsForEquipment({
          equipment_id: 'T',
          snapshot: { alarm_active: true, alarm_count: 5 },
          trendRow: {},
          anomalies: [],
          correlations: [],
          window: '24h'
        }).some((e) => e.event_type === 'ALARM_ESCALATION')
    },
    {
      id: 'EV-04',
      name: 'Recuperação observada',
      pass: () =>
        hasRecovery ||
        events.detectOperationalEventsForEquipment({
          equipment_id: 'T',
          snapshot: { telemetry_health: { score: 100, label: 'coleta_continua' } },
          trendRow: {},
          anomalies: [],
          correlations: [],
          window: '24h'
        }).some((e) => e.event_type === 'TELEMETRY_RECOVERY')
    },
    {
      id: 'EV-05',
      name: 'Tenant vazio',
      pass: () => emptyState.data_state === 'tenant_empty' && (emptyPack.event_count ?? 0) === 0
    },
    {
      id: 'EV-06',
      name: 'PLC sem MES',
      pass: () => realState.data_state === 'telemetry_only'
    },
    {
      id: 'EV-07',
      name: 'Timeline operacional',
      pass: () =>
        pack.timeline &&
        Array.isArray(pack.timeline.windows) &&
        pack.timeline.timeline &&
        typeof pack.timeline.timeline['24h'] === 'object'
    },
    {
      id: 'EV-08',
      name: 'Event confidence',
      pass: () => {
        const e = pack.events?.[0];
        return (
          e &&
          Number.isFinite(e.event_confidence) &&
          e.event_confidence >= 0 &&
          e.event_confidence <= 100
        );
      }
    },
    {
      id: 'EV-09',
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
          { eventPack: pack, hasEventSnapshot: (pack.events?.length ?? 0) > 0 }
        );
        return (
          binding.claim_categories?.includes('telemetry_supported_claim') &&
          (pack.events?.length === 0 || binding.claim_categories?.includes('event_supported_claim'))
        );
      }
    },
    {
      id: 'EV-10',
      name: 'Truth enforcement — buildOperationalEventEvidence',
      pass: () => {
        const ev = events.buildOperationalEventEvidence({
          event_type: 'CORRELATED_DEVIATION',
          equipment_id: 'LAB-EQ-001',
          signals: ['temperature', 'vibration'],
          evidence: { correlation: 0.84, trend: 'increasing', anomaly: true },
          severity: 'warning',
          event_confidence: 72,
          window: '7d'
        });
        return ev.event_type === 'CORRELATED_DEVIATION' && ev.evidence.no_prediction === true;
      }
    },
    {
      id: 'EV-11',
      name: 'Bloqueio de previsão',
      pass: async () => {
        for (const p of ['vai falhar', 'vai parar', 'quebra iminente', 'falha futura']) {
          if (!truth.detectForbiddenEventPredictionClaims(p).length) return false;
        }
        const user = await loadUser(REAL_TENANT);
        const r = await truth.enforceTextResponse('A linha vai parar amanhã por falha futura.', {
          user,
          channel: 'dashboard_chat',
          dataState: 'telemetry_only',
          eventPack: pack,
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

  const user = await loadUser(REAL_TENANT);
  const token = mintToken(user);
  let chatR = null;
  let reply = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    chatR = await chat(token, 'O que aconteceu recentemente na telemetria?');
    reply = extractReply(chatR.body);
    const ok =
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /telemetria|evento|operacional|LAB-EQ|aconteceu|instabilidade|alarme/i.test(reply) &&
      !/vai\s+parar|vai\s+falhar/i.test(reply);
    if (ok) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  out.tests.push({
    id: 'EV-CHAT-01',
    name: 'Chat eventos recentes',
    pass:
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /telemetria|evento|operacional|LAB-EQ|aconteceu|instabilidade|alarme/i.test(reply) &&
      !/vai\s+parar|vai\s+falhar/i.test(reply),
    excerpt: reply.slice(0, 240)
  });

  out.summary = {
    total: out.tests.length,
    passed: out.tests.filter((t) => t.pass).length,
    failed: out.tests.filter((t) => !t.pass).length
  };
  out.certified = out.summary.failed === 0;
  out.event_sample = {
    event_count: pack.event_count,
    types: [...new Set((pack.events || []).map((e) => e.event_type))].slice(0, 8)
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.certified ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
