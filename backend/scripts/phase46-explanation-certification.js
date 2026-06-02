#!/usr/bin/env node
'use strict';

/**
 * FASE 46-J — Certificação Operational Explanation Intelligence (EX-01 … EX-10 + CHAT).
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
  const expl = require('../src/services/operationalExplanationService');
  const truth = require('../src/services/industrialTruthEnforcementService');
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');

  const out = { phase: '46-J', generated_at: new Date().toISOString(), tests: [] };

  const realState = await resolveOperationalDataState(REAL_TENANT, { machines: [], events: [] });
  const emptyState = await resolveOperationalDataState(EMPTY_TENANT, { machines: [], events: [] });

  const pack = await expl.buildOperationalExplanationPack(REAL_TENANT);
  const emptyPack = await expl.buildOperationalExplanationPack(EMPTY_TENANT);

  const mockBundle = {
    plc: { snapshot: { equipment_count: 1, telemetry_health: { score: 80 } } },
    trend: { equipment_risk: [{ equipment_id: 'T', risk_score: 30, factors: ['vibration_increase_12%'] }] },
    anomaly: {
      anomalies: [
        {
          equipment_id: 'T',
          signal: 'vibration',
          classification: 'anomaly',
          deviation_percent: 42
        }
      ],
      equipment_attention: [{ equipment_id: 'T', attention_score: 58, factors: ['anomaly_vibration'] }]
    },
    correlation: { correlation_pairs: [] },
    event_pack: {
      events: [
        {
          event_type: 'SIGNAL_INSTABILITY',
          equipment_id: 'T',
          window: '24h',
          severity: 'attention',
          event_confidence: 65,
          signals: ['vibration'],
          evidence: { anomaly: true }
        }
      ]
    },
    pattern_pack: {
      patterns: [
        {
          pattern_type: 'RECURRING_SIGNAL_INSTABILITY',
          equipment_id: 'T',
          occurrences: 7,
          windows: ['24h', '7d'],
          observed_pattern: true,
          pattern_confidence: 70,
          signals: ['vibration']
        }
      ]
    }
  };

  const eventExpl = expl.buildEventExplanation(mockBundle.event_pack.events[0], mockBundle);
  const patternExpl = expl.buildPatternExplanation(mockBundle.pattern_pack.patterns[0], mockBundle);
  const contrib = expl.buildOperationalContributionAnalysis({
    target: 'attention_score',
    equipment_id: 'T',
    anomalies: mockBundle.anomaly.anomalies,
    attention: mockBundle.anomaly.equipment_attention[0]
  });

  const unitTests = [
    {
      id: 'EX-01',
      name: 'Event explanation',
      pass: () =>
        (pack.explanations || []).some((e) => e.entity_type === 'event') ||
        (eventExpl.entity_type === 'event' &&
          eventExpl.no_causality === true &&
          eventExpl.evidence.length > 0)
    },
    {
      id: 'EX-02',
      name: 'Pattern explanation',
      pass: () =>
        (pack.explanations || []).some((e) => e.entity_type === 'pattern') ||
        (patternExpl.entity_type === 'pattern' && patternExpl.observational_only === true)
    },
    {
      id: 'EX-03',
      name: 'Contribution analysis',
      pass: () => {
        const c = contrib.contributions || [];
        const vib = c.find((x) => x.signal === 'vibration');
        return c.length > 0 && vib && vib.contribution_percent > 0;
      }
    },
    {
      id: 'EX-04',
      name: 'Evidence chain',
      pass: () =>
        eventExpl.evidence_chain &&
        eventExpl.evidence_chain.llm_text_used === false &&
        eventExpl.evidence_chain.telemetry?.available === true
    },
    {
      id: 'EX-05',
      name: 'Traceability map',
      pass: () =>
        pack.traceability &&
        Array.isArray(pack.traceability.layers) &&
        pack.traceability.layers.length >= 7
    },
    {
      id: 'EX-06',
      name: 'Tenant vazio',
      pass: () => emptyState.data_state === 'tenant_empty' && (emptyPack.explanation_count ?? 0) === 0
    },
    {
      id: 'EX-07',
      name: 'PLC sem MES',
      pass: () => realState.data_state === 'telemetry_only'
    },
    {
      id: 'EX-08',
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
            explanationPack: pack,
            hasExplanationSnapshot: (pack.explanations?.length ?? 0) > 0
          }
        );
        return (
          binding.claim_categories?.includes('telemetry_supported_claim') &&
          (pack.explanations?.length === 0 ||
            binding.claim_categories?.includes('explanation_supported_claim'))
        );
      }
    },
    {
      id: 'EX-09',
      name: 'Truth enforcement — operational_explanation',
      pass: () => {
        const o = expl.buildOperationalExplanation({
          entity_type: 'event',
          entity_id: 'SIGNAL_INSTABILITY',
          summary: 'Teste',
          evidence: [{ type: 'anomaly', signal: 'vibration' }]
        });
        return o.no_prediction === true && o.no_causality === true && o.observational_only === true;
      }
    },
    {
      id: 'EX-10',
      name: 'Root cause block',
      pass: async () => {
        for (const p of [
          'sabemos a causa',
          'foi provocado por',
          'a origem do problema é',
          'causa raiz confirmada'
        ]) {
          if (!truth.detectForbiddenRootCauseClaims(p).length) return false;
        }
        const user = await loadUser(REAL_TENANT);
        const r = await truth.enforceTextResponse(
          'Sabemos a causa: a vibração foi provocada por falha mecânica — causa raiz confirmada.',
          {
            user,
            channel: 'dashboard_chat',
            dataState: 'telemetry_only',
            explanationPack: pack,
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
    chatR = await chat(token, 'Por que este equipamento merece atenção na telemetria?');
    reply = extractReply(chatR.body);
    const ok =
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /aten[cç][aã]o|telemetria|evid[eê]ncia|contribui|LAB-EQ|classificad|observad/i.test(reply) &&
      !/causa\s+raiz\s+confirmada|foi\s+provocado\s+por|sabemos\s+a\s+causa/i.test(reply);
    if (ok) break;
    await new Promise((r) => setTimeout(r, 1500));
  }
  out.tests.push({
    id: 'EX-CHAT-01',
    name: 'Chat explicações',
    pass:
      chatR.status === 200 &&
      reply !== 'UNSUPPORTED_OPERATIONAL_CLAIM' &&
      /aten[cç][aã]o|telemetria|evid[eê]ncia|contribui|LAB-EQ|classificad|observad/i.test(reply) &&
      !/causa\s+raiz\s+confirmada|foi\s+provocado\s+por/i.test(reply),
    excerpt: reply.slice(0, 240)
  });

  out.summary = {
    total: out.tests.length,
    passed: out.tests.filter((t) => t.pass).length,
    failed: out.tests.filter((t) => !t.pass).length
  };
  out.certified = out.summary.failed === 0;
  out.explanation_sample = {
    explanation_count: pack.explanation_count,
    types: [...new Set((pack.explanations || []).map((e) => e.entity_type))]
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.certified ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
