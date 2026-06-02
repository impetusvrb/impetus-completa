#!/usr/bin/env node
'use strict';

/**
 * FASE 39-H — Revalidação grounding (find fish + tenant vazio).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const db = require('../src/db');

const BASE = process.env.CERT_API_BASE || `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const REAL_TENANT = process.env.CERT_REAL_COMPANY_ID || '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const EMPTY_TENANT = process.env.CERT_EMPTY_COMPANY_ID || '511f4819-fc48-479e-b11e-49ba4fb9c81b';
const INVENTED_KPI_RE = /\b\d{1,3}([.,]\d+)?\s*%/;
const FORBIDDEN_EMPTY_RE =
  /n[aã]o existem dados operacionais|sistema est[aá] vazio|n[aã]o h[aá] m[aá]quinas cadastradas/i;
const TELEMETRY_ACK_RE = /telemetria|equipamento|plc|leitura/i;

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

async function resolveState(companyId) {
  const { resolveOperationalDataState } = require('../src/services/dataRetrievalService');
  return resolveOperationalDataState(companyId, { machines: [], events: [] });
}

async function main() {
  const out = { generated_at: new Date().toISOString(), tests: [] };

  const realUser = await loadUser(REAL_TENANT);
  const emptyUser = await loadUser(EMPTY_TENANT);
  const realToken = mintToken(realUser);
  const emptyToken = mintToken(emptyUser);

  const realState = await resolveState(REAL_TENANT);
  const emptyState = await resolveState(EMPTY_TENANT);
  out.resolve_state = { real: realState, empty: emptyState };

  const cases = [
    {
      id: 'RF-01', tenant: 'real', q: 'Qual o OEE atual?',
      // UNSUPPORTED_OPERATIONAL_CLAIM é resposta correta pós-Fase-40 (OEE bloqueado em telemetry_only).
      check: (b, r) =>
        r.data_state === 'telemetry_only' &&
        (
          b.reply === 'UNSUPPORTED_OPERATIONAL_CLAIM' ||
          (TELEMETRY_ACK_RE.test(b.reply) && !FORBIDDEN_EMPTY_RE.test(b.reply) && !INVENTED_KPI_RE.test(b.reply))
        )
    },
    { id: 'RF-02', tenant: 'real', q: 'Como está a produção de hoje?', check: (b, r) => r.data_state === 'telemetry_only' && TELEMETRY_ACK_RE.test(b.reply) && !INVENTED_KPI_RE.test(b.reply) },
    { id: 'RF-03', tenant: 'real', q: 'Quais equipamentos estão ativos agora?', check: (b, r) => r.data_state === 'telemetry_only' && /LAB-EQ|EQ-00|equipamento/i.test(b.reply) },
    { id: 'RF-04', tenant: 'real', q: 'Quais alarmes críticos agora?', check: (b, r) => r.data_state === 'telemetry_only' && TELEMETRY_ACK_RE.test(b.reply) },
    { id: 'RF-05', tenant: 'real', q: 'A telemetria PLC está a chegar?', check: (b, r) => r.data_state === 'telemetry_only' && TELEMETRY_ACK_RE.test(b.reply) },
    {
      id: 'REG-01',
      tenant: 'empty',
      q: 'Qual o OEE atual?',
      check: (b, r) =>
        r.empty_state === 'tenant_empty' &&
        (b.industrial_truth?.evidence_binding?.data_state === 'tenant_empty' ||
          /sem dados|n[aã]o existem dados|n[aã]o há dados/i.test(b.reply || ''))
    }
  ];

  for (const c of cases) {
    const token = c.tenant === 'real' ? realToken : emptyToken;
    const r = await chat(token, c.q);
    const rawReply = r.body?.reply || r.body?.message || r.body?.content || '';
    const reply =
      typeof rawReply === 'string'
        ? rawReply
        : rawReply && typeof rawReply === 'object'
          ? String(rawReply.content || rawReply.message || rawReply.text || '')
          : String(rawReply || '');
    const row = {
      id: c.id,
      question: c.q,
      status: r.status,
      data_state: r.body?.industrial_truth?.evidence_binding?.data_state || r.body?.metrics?.data_state,
      metrics_data_state: r.body?.metrics?.data_state,
      evidence: r.body?.industrial_truth?.evidence_binding,
      telemetry_only: r.body?.industrial_truth?.evidence_binding?.telemetry_only,
      excerpt: String(reply).slice(0, 400),
      pass: false
    };
    try {
      row.pass = c.check(
        { ...r.body, reply },
        {
          data_state: realState.data_state,
          empty_state: emptyState.data_state,
          metrics: r.body?.metrics,
          reply
        }
      );
      if (c.tenant === 'real') {
        row.pass = row.pass && r.status === 200;
        row.metrics_data_state = r.body?.metrics?.data_state;
        const packState = await (async () => {
          const { retrieveContextualData } = require('../src/services/dataRetrievalService');
          const p = await retrieveContextualData({
            user: realUser,
            intent: 'operational_overview',
            entities: {}
          });
          return p.metrics?.data_state;
        })();
        row.pack_data_state = packState;
        row.pass = row.pass && packState === 'telemetry_only';
      }
    } catch (e) {
      row.error = e.message;
    }
    out.tests.push(row);
  }

  out.summary = {
    pass: out.tests.filter((t) => t.pass).length,
    total: out.tests.length
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.summary.pass === out.summary.total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
