#!/usr/bin/env node
'use strict';

/**
 * FASE 40-F — Certificação PLC Operational Intelligence (TI-01 … TI-10).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const db = require('../src/db');

const BASE = process.env.CERT_API_BASE || `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const REAL_TENANT = process.env.CERT_REAL_COMPANY_ID || '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const EMPTY_TENANT = process.env.CERT_EMPTY_COMPANY_ID || '511f4819-fc48-479e-b11e-49ba4fb9c81b';

const FORBIDDEN_KPI_RE = /\b\d{1,3}([.,]\d+)?\s*%\s*(de\s+)?(oee|qualidade|efici[eê]ncia)\b/i;
const INVENTED_OEE_NUM_RE = /\boee\s*(de|é|esta|est[aá])\s*\d/i;

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
  const body = await res.json();
  return { status: res.status, body };
}

function extractReply(body) {
  const raw = body?.reply || body?.message || body?.content || '';
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    return String(raw.content || raw.message || raw.text || '');
  }
  return String(raw || '');
}

async function main() {
  const plcIntel = require('../src/services/plcOperationalIntelligenceService');
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');
  const truth = require('../src/services/industrialTruthEnforcementService');

  const out = {
    phase: '40-F',
    generated_at: new Date().toISOString(),
    tests: []
  };

  const realState = await resolveOperationalDataState(REAL_TENANT, { machines: [], events: [] });
  const emptyState = await resolveOperationalDataState(EMPTY_TENANT, { machines: [], events: [] });
  out.data_states = { real: realState, empty: emptyState };

  const pack = await plcIntel.buildPlcOperationalPack(REAL_TENANT);
  out.plc_pack_summary = {
    snapshot: pack.snapshot,
    equipment_count: pack.equipment_operational_summary?.length ?? 0
  };

  const snap = pack.snapshot || {};
  const summaries = pack.equipment_operational_summary || [];

  const unitTests = [
    {
      id: 'TI-01',
      name: 'Equipamentos ativos',
      pass:
        snap.equipment_count > 0 &&
        typeof snap.active_equipment_count === 'number' &&
        snap.active_equipment_count >= 0
    },
    {
      id: 'TI-02',
      name: 'Última coleta',
      pass: Boolean(snap.last_collection_at)
    },
    {
      id: 'TI-03',
      name: 'Alarmes auditáveis',
      pass: typeof snap.alarm_count === 'number' && typeof snap.alarm_active === 'boolean'
    },
    {
      id: 'TI-04',
      name: 'Runtime estimado',
      pass: typeof snap.runtime_hours === 'number' && snap.runtime_hours >= 0
    },
    {
      id: 'TI-05',
      name: 'Saúde da telemetria',
      pass:
        pack.telemetry_health_detail &&
        Number.isFinite(pack.telemetry_health_detail.score) &&
        pack.telemetry_health_detail.score >= 0 &&
        pack.telemetry_health_detail.score <= 100
    },
    {
      id: 'TI-06',
      name: 'Tenant vazio',
      pass: emptyState.data_state === 'tenant_empty'
    },
    {
      id: 'TI-07',
      name: 'PLC ativo sem MES',
      pass: realState.data_state === 'telemetry_only' && snap.equipment_count > 0
    },
    {
      id: 'TI-08',
      name: 'PLC inativo (tenant vazio sem PLC)',
      pass: async () => {
        const emptyPack = await plcIntel.buildPlcOperationalPack(EMPTY_TENANT);
        return (
          emptyState.data_state === 'tenant_empty' &&
          (emptyPack.snapshot?.equipment_count ?? 0) === 0
        );
      }
    },
    {
      id: 'TI-09',
      name: 'Alarmes críticos observáveis',
      pass: summaries.every((s) => typeof s.alarm_frequency === 'number')
    },
    {
      id: 'TI-10',
      name: 'Evidence Binding',
      pass: async () => {
        const evidence = plcIntel.collectTelemetryEvidenceNumbers(pack);
        const binding = truth.buildEvidenceBinding(
          {
            company_id: REAL_TENANT,
            has_any_data: true,
            data_state: 'telemetry_only',
            domain_checks: [
              { has_data: true, domain: 'telemetria', source_table: 'plc_collected_data' }
            ]
          },
          'dashboard_chat'
        );
        return (
          binding.source_table === 'plc_collected_data' &&
          binding.telemetry_only === true &&
          evidence.size > 0
        );
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
  const emptyUser = await loadUser(EMPTY_TENANT);
  const realToken = mintToken(realUser);
  const emptyToken = mintToken(emptyUser);

  const chatCases = [
    {
      id: 'TI-CHAT-01',
      token: realToken,
      q: 'Quais equipamentos estão ativos agora?',
      check: (reply, body) =>
        body?.industrial_truth?.evidence_binding?.telemetry_only === true &&
        /equipamento|LAB-EQ|telemetria/i.test(reply)
    },
    {
      id: 'TI-CHAT-02',
      token: realToken,
      q: 'Qual foi a última coleta PLC?',
      check: (reply) => /coleta|telemetria|plc/i.test(reply)
    },
    {
      id: 'TI-CHAT-03',
      token: realToken,
      q: 'Qual o OEE atual?',
      check: (reply) => !FORBIDDEN_KPI_RE.test(reply) && !INVENTED_OEE_NUM_RE.test(reply)
    },
    {
      id: 'TI-CHAT-04',
      token: emptyToken,
      q: 'Qual o OEE atual?',
      check: (reply, body) =>
        body?.industrial_truth?.evidence_binding?.data_state === 'tenant_empty' ||
        /sem dados|n[aã]o existem dados/i.test(reply)
    }
  ];

  for (const c of chatCases) {
    const r = await chat(c.token, c.q);
    const reply = extractReply(r.body);
    let pass = false;
    try {
      pass = c.check(reply, r.body) && r.status === 200;
    } catch (e) {
      pass = false;
    }
    out.tests.push({
      id: c.id,
      name: c.q,
      pass,
      status: r.status,
      excerpt: reply.slice(0, 280),
      evidence: r.body?.industrial_truth?.evidence_binding
    });
  }

  const passed = out.tests.filter((t) => t.pass).length;
  out.summary = { total: out.tests.length, passed, failed: out.tests.length - passed };
  out.certified = passed === out.tests.length;

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.certified ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
