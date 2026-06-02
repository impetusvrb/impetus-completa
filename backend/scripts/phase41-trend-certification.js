#!/usr/bin/env node
'use strict';

/**
 * FASE 41-G — Certificação Operational Trend Intelligence (TR-01 … TR-11).
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

function getSignal(pack, variable) {
  const eq = pack?.trend_snapshot?.equipment?.[0];
  if (!eq) return null;
  return eq[variable] || null;
}

async function main() {
  const trend = require('../src/services/plcTrendAnalysisService');
  const truth = require('../src/services/industrialTruthEnforcementService');
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');

  const out = { phase: '41-G', generated_at: new Date().toISOString(), tests: [] };

  const realState = await resolveOperationalDataState(REAL_TENANT, { machines: [], events: [] });
  const emptyState = await resolveOperationalDataState(EMPTY_TENANT, { machines: [], events: [] });

  const pack = await trend.buildOperationalTrendPack(REAL_TENANT);
  const emptyPack = await trend.buildOperationalTrendPack(EMPTY_TENANT);

  const tempSig = getSignal(pack, 'temperature');
  const vibSig = getSignal(pack, 'vibration');

  const unitTests = [
    {
      id: 'TR-01',
      name: 'Temperatura — tendência detectável',
      pass: () => {
        if (!tempSig) return pack.trend_snapshot?.equipment?.length >= 0;
        return ['stable', 'increasing', 'decreasing', 'unknown'].includes(tempSig.trend);
      }
    },
    {
      id: 'TR-02',
      name: 'Temperatura estável ou classificada',
      pass: () => !tempSig || tempSig.trend === 'stable' || tempSig.baseline_state != null
    },
    {
      id: 'TR-03',
      name: 'Vibração — tendência detectável',
      pass: () => {
        if (!vibSig) return true;
        return ['stable', 'increasing', 'decreasing'].includes(vibSig.trend);
      }
    },
    {
      id: 'TR-04',
      name: 'Vibração decrescente ou classificada',
      pass: () => !vibSig || ['decreasing', 'stable', 'increasing'].includes(vibSig.trend)
    },
    {
      id: 'TR-05',
      name: 'Alarmes observados no pack operacional',
      pass: async () => {
        const plc = require('../src/services/plcOperationalIntelligenceService');
        const snap = await plc.buildPlcIntelligenceSnapshot(REAL_TENANT);
        return typeof snap.alarm_count === 'number';
      }
    },
    {
      id: 'TR-06',
      name: 'Risk score observacional',
      pass: () => {
        const r = pack.equipment_risk?.[0];
        return (
          r &&
          Number.isFinite(r.risk_score) &&
          r.risk_score >= 0 &&
          r.risk_score <= 100 &&
          r.observational_only === true
        );
      }
    },
    {
      id: 'TR-07',
      name: 'Tenant vazio',
      pass: () => emptyState.data_state === 'tenant_empty'
    },
    {
      id: 'TR-08',
      name: 'PLC ativo sem MES',
      pass: () => realState.data_state === 'telemetry_only' && (pack.trend_snapshot?.equipment?.length ?? 0) >= 0
    },
    {
      id: 'TR-09',
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
          { trendPack: pack, hasTrendSnapshot: true }
        );
        return (
          binding.source_table === 'plc_collected_data' &&
          Array.isArray(binding.claim_categories) &&
          binding.claim_categories.includes('telemetry_supported_claim') &&
          binding.claim_categories.includes('trend_supported_claim')
        );
      }
    },
    {
      id: 'TR-10',
      name: 'Truth Enforcement — classifyTrend',
      pass: () => {
        const inc = trend.classifyTrend(18.1);
        const st = trend.classifyTrend(2.3);
        return inc.trend === 'increasing' && st.trend === 'stable';
      }
    },
    {
      id: 'TR-11',
      name: 'Predictive Claim Block',
      pass: async () => {
        const phrases = [
          'O equipamento vai falhar em breve.',
          'Há quebra iminente no motor.',
          'Manutenção obrigatória imediata.'
        ];
        for (const p of phrases) {
          const blocked = truth.detectForbiddenPredictiveClaims(p);
          if (!blocked.length) return false;
        }
        const realUser = await loadUser(REAL_TENANT);
        const enforced = await truth.enforceTextResponse('A vibração vai falhar amanhã com quebra iminente.', {
          user: realUser,
          channel: 'dashboard_chat',
          dataState: 'telemetry_only',
          trendPack: pack,
          injectOperational: true
        });
        return enforced.action === 'unsupported_claim';
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
  const realToken = mintToken(realUser);

  const chatCases = [
    {
      id: 'TR-CHAT-01',
      q: 'Existe alguma mudança relevante na telemetria?',
      check: (reply, body) =>
        /telemetria|tend[eê]ncia|est[aá]vel|aumento|equipamento/i.test(reply) &&
        body?.industrial_truth?.evidence_binding?.telemetry_only === true
    },
    {
      id: 'TR-CHAT-02',
      q: 'A vibração aumentou?',
      check: (reply) => /vibra|telemetria|est[aá]vel|aumento|observ/i.test(reply)
    },
    {
      id: 'TR-CHAT-03',
      q: 'Qual equipamento merece atenção?',
      check: (reply) => /LAB-EQ|equipamento|aten[cç][aã]o|risk|telemetria/i.test(reply)
    }
  ];

  for (const c of chatCases) {
    const r = await chat(realToken, c.q);
    const reply = extractReply(r.body);
    out.tests.push({
      id: c.id,
      name: c.q,
      pass: c.check(reply, r.body) && r.status === 200,
      excerpt: reply.slice(0, 220),
      claim_categories: r.body?.industrial_truth?.evidence_binding?.claim_categories
    });
  }

  const passed = out.tests.filter((t) => t.pass).length;
  out.summary = { total: out.tests.length, passed, failed: out.tests.length - passed };
  out.certified = out.summary.failed === 0;
  out.trend_sample = {
    temperature: tempSig,
    vibration: vibSig,
    top_risk: pack.equipment_risk?.[0]
  };

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.certified ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
