#!/usr/bin/env node
'use strict';

/**
 * FASE 45-K — Certificação Operational Pattern Intelligence (PT-01 … PT-11).
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
  const patterns = require('../src/services/operationalPatternIntelligenceService');
  const truth = require('../src/services/industrialTruthEnforcementService');
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');

  const out = { phase: '45-K', generated_at: new Date().toISOString(), tests: [] };

  const realState = await resolveOperationalDataState(REAL_TENANT, { machines: [], events: [] });
  const emptyState = await resolveOperationalDataState(EMPTY_TENANT, { machines: [], events: [] });

  const pack = await patterns.buildOperationalPatternPack(REAL_TENANT);
  const emptyPack = await patterns.buildOperationalPatternPack(EMPTY_TENANT);

  const recurring = (pack.patterns || []).filter((p) => p.observed_pattern);
  const hasRecurring = recurring.some(
    (p) => p.pattern_type !== patterns.PATTERN_TYPES.STABLE_OPERATION_PATTERN
  );
  const hasStable = recurring.some(
    (p) => p.pattern_type === patterns.PATTERN_TYPES.STABLE_OPERATION_PATTERN
  );
  const hasAlarmPattern = recurring.some(
    (p) => p.pattern_type === patterns.PATTERN_TYPES.RECURRING_ALARM_ESCALATION
  );

  const syntheticRecurring = patterns.detectOperationalPatternsFromEvents([
    {
      event_type: 'SIGNAL_INSTABILITY',
      equipment_id: 'T-PT',
      window: '24h',
      severity: 'attention',
      event_confidence: 60,
      signals: ['vibration']
    },
    {
      event_type: 'SIGNAL_INSTABILITY',
      equipment_id: 'T-PT',
      window: '7d',
      severity: 'attention',
      event_confidence: 65,
      signals: ['vibration']
    }
  ]);

  const syntheticIsolated = patterns.detectOperationalPatternsFromEvents([
    {
      event_type: 'SIGNAL_INSTABILITY',
      equipment_id: 'T-ISO',
      window: '24h',
      severity: 'attention',
      event_confidence: 50,
      signals: ['vibration']
    }
  ]);

  const unitTests = [
    {
      id: 'PT-01',
      name: 'Padrão recorrente',
      pass: () =>
        hasRecurring ||
        syntheticRecurring.some((p) => p.pattern_type === 'RECURRING_SIGNAL_INSTABILITY')
    },
    {
      id: 'PT-02',
      name: 'Evento isolado',
      pass: () => syntheticIsolated.length === 0 && (pack.history?.isolated_events?.length ?? 0) >= 0
    },
    {
      id: 'PT-03',
      name: 'Alarmes recorrentes',
      pass: () =>
        hasAlarmPattern ||
        patterns.detectOperationalPatternsFromEvents([
          {
            event_type: 'ALARM_ESCALATION',
            equipment_id: 'T-A',
            window: '24h',
            severity: 'warning',
            event_confidence: 70
          },
          {
            event_type: 'ALARM_ESCALATION',
            equipment_id: 'T-A',
            window: '7d',
            severity: 'warning',
            event_confidence: 72
          }
        ]).length > 0
    },
    {
      id: 'PT-04',
      name: 'Comportamento estável',
      pass: () =>
        hasStable ||
        patterns.detectOperationalPatternsFromEvents([
          {
            event_type: 'NORMAL_OPERATION',
            equipment_id: 'T-S',
            window: '24h',
            severity: 'informational',
            event_confidence: 40
          },
          {
            event_type: 'NORMAL_OPERATION',
            equipment_id: 'T-S',
            window: '7d',
            severity: 'informational',
            event_confidence: 42
          }
        ]).some((p) => p.pattern_type === 'STABLE_OPERATION_PATTERN')
    },
    {
      id: 'PT-05',
      name: 'Tenant vazio',
      pass: () => emptyState.data_state === 'tenant_empty' && (emptyPack.pattern_count ?? 0) === 0
    },
    {
      id: 'PT-06',
      name: 'PLC sem MES',
      pass: () => realState.data_state === 'telemetry_only'
    },
    {
      id: 'PT-07',
      name: 'Pattern confidence',
      pass: () => {
        const p = recurring[0] || syntheticRecurring[0];
        return (
          p &&
          Number.isFinite(p.pattern_confidence) &&
          p.pattern_confidence >= 0 &&
          p.pattern_confidence <= 100
        );
      }
    },
    {
      id: 'PT-08',
      name: 'Pattern history',
      pass: () =>
        pack.history &&
        Array.isArray(pack.history.windows) &&
        pack.history.history &&
        typeof pack.history.history['90d'] === 'object'
    },
    {
      id: 'PT-09',
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
          { patternPack: pack, hasPatternSnapshot: (pack.patterns?.length ?? 0) > 0 }
        );
        return (
          binding.claim_categories?.includes('telemetry_supported_claim') &&
          (pack.patterns?.length === 0 ||
            binding.claim_categories?.includes('pattern_supported_claim'))
        );
      }
    },
    {
      id: 'PT-10',
      name: 'Truth enforcement — buildPatternEvidence',
      pass: () => {
        const p = patterns.buildPatternEvidence({
          pattern_type: 'RECURRING_SIGNAL_INSTABILITY',
          equipment_id: 'LAB-EQ-001',
          occurrences: 7,
          windows: ['24h', '7d', '30d'],
          evidence: { observed_pattern: true },
          severity: 'attention',
          pattern_confidence: 68
        });
        return (
          p.pattern_type === 'RECURRING_SIGNAL_INSTABILITY' &&
          p.evidence.no_prediction === true &&
          p.evidence.no_causality_inferred === true
        );
      }
    },
    {
      id: 'PT-11',
      name: 'Bloqueio de previsão',
      pass: async () => {
        for (const phrase of [
          'vai acontecer novamente',
          'voltará a ocorrer',
          'é inevitável',
          'vai piorar',
          'causa raiz encontrada'
        ]) {
          if (!truth.detectForbiddenPatternPredictionClaims(phrase).length) return false;
        }
        const user = await loadUser(REAL_TENANT);
        const r = await truth.enforceTextResponse(
          'Esse equipamento irá apresentar o mesmo problema novamente porque é inevitável.',
          {
            user,
            channel: 'dashboard_chat',
            dataState: 'telemetry_only',
            patternPack: pack,
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
    chatR = await chat(token, 'Existem padrões recorrentes na telemetria?');
    reply = extractReply(chatR.body);
    const ok =
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /padr[aã]o|recorrente|telemetria|LAB-EQ|repetitivo|ocorreu/i.test(reply) &&
      !/vai\s+acontecer\s+novamente|voltar[aá]\s+a\s+ocorrer|ir[aá]\s+apresentar\s+o\s+mesmo\s+problema\s+novamente/i.test(
        reply
      );
    if (ok) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  out.tests.push({
    id: 'PT-CHAT-01',
    name: 'Chat padrões',
    pass:
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /padr[aã]o|recorrente|telemetria|LAB-EQ|repetitivo|ocorreu/i.test(reply) &&
      !/vai\s+acontecer\s+novamente|voltar[aá]\s+a\s+ocorrer/i.test(reply),
    excerpt: reply.slice(0, 240)
  });

  out.summary = {
    total: out.tests.length,
    passed: out.tests.filter((t) => t.pass).length,
    failed: out.tests.filter((t) => !t.pass).length
  };
  out.certified = out.summary.failed === 0;
  out.pattern_sample = {
    pattern_count: pack.pattern_count,
    types: [...new Set((pack.patterns || []).map((p) => p.pattern_type))].slice(0, 8)
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.certified ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
