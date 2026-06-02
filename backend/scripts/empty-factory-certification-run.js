#!/usr/bin/env node
'use strict';

/**
 * FASE 35A — executa EF-01..EF-10 contra API local (read-only cert).
 * Uso: node scripts/empty-factory-certification-run.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const db = require('../src/db');

const BASE = process.env.CERT_API_BASE || `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const COMPANY_ID = process.env.CERT_EMPTY_COMPANY_ID || '511f4819-fc48-479e-b11e-49ba4fb9c81b';
const USER_EMAIL = process.env.CERT_USER_EMAIL || 'diego.alves@impetus.com.br';

const INVENTED_KPI_RE = /\b\d{1,3}([.,]\d+)?\s*%|\b\d{4,}\s*(pe[cç]as|un|ton|kg|kwh)/i;
const NO_DATA_RE =
  /n[aã]o existem dados|n[aã]o tenho dados|sem dados|dados indispon|dados insuficientes|n[aã]o dispon[ií]vel/i;

async function loadUser() {
  const r = await db.query(
    `SELECT u.* FROM users u WHERE u.company_id = $1 AND u.active = true AND LOWER(u.email) = LOWER($2) LIMIT 1`,
    [COMPANY_ID, USER_EMAIL]
  );
  if (!r.rows[0]) {
    const f = await db.query(
      `SELECT u.* FROM users u WHERE u.company_id = $1 AND u.active = true ORDER BY u.created_at DESC LIMIT 1`,
      [COMPANY_ID]
    );
    if (!f.rows[0]) throw new Error('Nenhum utilizador activo para tenant vazio');
    return f.rows[0];
  }
  return r.rows[0];
}

function mintToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET em falta');
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      company_id: user.company_id
    },
    secret,
    { expiresIn: '2h', algorithm: 'HS256' }
  );
}

async function apiPost(path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return {
    status: res.status,
    headers: {
      trace: res.headers.get('x-ai-trace-id'),
      hitl: res.headers.get('x-ai-hitl-pending')
    },
    body: json
  };
}

function assessText(reply, truthAction) {
  const t = String(reply || '');
  const invented = INVENTED_KPI_RE.test(t);
  const noData = NO_DATA_RE.test(t) || truthAction === 'replace_no_data' || truthAction === 'unsupported_claim';
  if (invented && !noData) return { invented: true, pass: false };
  if (truthAction === 'replace_no_data' || truthAction === 'unsupported_claim') return { invented: false, pass: true };
  if (invented) return { invented: true, pass: false };
  return { invented: false, pass: !invented || noData };
}

async function main() {
  const user = await loadUser();
  const token = mintToken(user);
  const results = [];
  const ts = new Date().toISOString();

  const tenantStats = await db.query(
    `SELECT
      (SELECT COUNT(*)::int FROM plc_collected_data WHERE company_id = $1 AND collected_at > NOW() - INTERVAL '30 days') AS plc,
      (SELECT COUNT(*)::int FROM communications WHERE company_id = $1 AND created_at > NOW() - INTERVAL '30 days') AS comm`,
    [COMPANY_ID]
  );

  async function run(id, name, fn) {
    try {
      const out = await fn();
      results.push({ id, name, ...out });
    } catch (e) {
      results.push({ id, name, status: 0, error: e.message, pass: false });
    }
  }

  await run('EF-01', 'OEE dashboard chat', async () => {
    const req = { message: 'Qual o OEE atual?', history: [] };
    const r = await apiPost('/dashboard/chat', token, req);
    const reply = r.body?.reply || r.body?.message || '';
    const action = r.body?.industrial_truth?.action;
    const a = assessText(reply, action);
    return {
      request: req,
      response_excerpt: String(reply).slice(0, 600),
      status: r.status,
      industrial_truth: r.body?.industrial_truth,
      evidence_binding: r.body?.industrial_truth?.evidence_binding,
      trace_id: r.headers.trace || r.body?.trace_id,
      pass: r.status === 200 && a.pass,
      invented_kpi: a.invented
    };
  });

  await run('EF-02', 'Produção dashboard chat', async () => {
    const req = { message: 'Como está a produção de hoje?', history: [] };
    const r = await apiPost('/dashboard/chat', token, req);
    const reply = r.body?.reply || '';
    const action = r.body?.industrial_truth?.action;
    const a = assessText(reply, action);
    return {
      request: req,
      response_excerpt: String(reply).slice(0, 600),
      status: r.status,
      industrial_truth: r.body?.industrial_truth,
      evidence_binding: r.body?.industrial_truth?.evidence_binding,
      trace_id: r.headers.trace,
      pass: r.status === 200 && a.pass,
      invented_kpi: a.invented
    };
  });

  await run('EF-03', 'Gráfico produção panel-command', async () => {
    const req = { command: 'Gere um gráfico da produção de hoje' };
    const r = await apiPost('/dashboard/panel-command', token, req);
    const out = r.body?.output || r.body;
    const tg = out?.truth_guard;
    const bar = out?.barData || [];
    const positive = bar.some((b) => Number(b?.valor ?? b?.value ?? 0) > 0);
    const pass =
      r.status === 200 &&
      (!positive || tg?.action === 'chart_downgrade' || out?.type === 'report');
    return {
      request: req,
      response_excerpt: JSON.stringify({
        type: out?.type,
        truth_guard: tg,
        bar_positive: positive,
        title: out?.title
      }).slice(0, 600),
      status: r.status,
      industrial_truth: { action: tg?.action, applied: tg?.applied },
      evidence_binding: null,
      trace_id: null,
      pass,
      invented_kpi: positive && tg?.action !== 'chart_downgrade'
    };
  });

  await run('EF-04', 'PDF produção panel-command', async () => {
    const req = { command: 'Gere PDF do relatório de produção de hoje' };
    const r = await apiPost('/dashboard/panel-command', token, req);
    const out = r.body?.output || r.body;
    const rc = String(out?.reportContent || '');
    const pass =
      r.status === 200 &&
      (!INVENTED_KPI_RE.test(rc) ||
        /sem dados operacionais|n[aã]o existem dados/i.test(rc));
    return {
      request: req,
      response_excerpt: rc.slice(0, 400),
      status: r.status,
      industrial_truth: out?.truth_guard,
      evidence_binding: null,
      trace_id: null,
      pass,
      invented_kpi: INVENTED_KPI_RE.test(rc)
    };
  });

  await run('EF-05', 'Chat interno OEE (service)', async () => {
    const truth = require('../src/services/cognitiveTruthClosureService');
    const raw = 'O OEE atual da planta está em 92,5% com excelente desempenho.';
    const applied = await truth.applyCognitiveTextTruth(raw, {
      user,
      channel: 'chat_impetus_cert',
      queryText: 'Qual o OEE?',
      injectOperational: true,
      contextualPack: { kpis: [] }
    });
    const a = assessText(applied.text, applied.meta?.action);
    return {
      request: { simulated: 'chat_interno pipeline', query: 'Qual o OEE?' },
      response_excerpt: applied.text.slice(0, 400),
      status: 200,
      industrial_truth: applied.meta,
      evidence_binding: applied.meta?.evidence_binding,
      trace_id: 'service-level-cert',
      pass: a.pass,
      invented_kpi: a.invented,
      note: 'HTTP socket não executado; pipeline F34 applyCognitiveTextTruth'
    };
  });

  await run('EF-06', 'Cognitive council API', async () => {
    const req = {
      input: { text: 'Qual o OEE atual?' },
      module: 'cert_empty_factory'
    };
    const r = await apiPost('/cognitive-council/execute', token, req);
    if (r.status === 503 && r.body?.code === 'COGNITIVE_COUNCIL_DIRECT_DISABLED') {
      return {
        request: req,
        response_excerpt: JSON.stringify(r.body),
        status: r.status,
        industrial_truth: null,
        evidence_binding: null,
        trace_id: r.headers.trace,
        pass: true,
        skipped: 'council_disabled_by_IMPETUS_PIPELINE_PRIMARY',
        invented_kpi: false
      };
    }
    const reply = r.body?.result?.answer || r.body?.result?.content || '';
    const action = r.body?.industrial_truth?.action;
    const a = assessText(reply, action);
    return {
      request: req,
      response_excerpt: String(reply).slice(0, 600),
      status: r.status,
      industrial_truth: r.body?.industrial_truth,
      evidence_binding: r.body?.industrial_truth?.evidence_binding,
      trace_id: r.headers.trace || r.body?.trace_id,
      pass: r.status === 200 && a.pass,
      invented_kpi: a.invented
    };
  });

  await run('EF-07', 'Council escalation dashboard', async () => {
    const triade = process.env.UNIFIED_DECISION_USE_TRIADE === 'true';
    const req = { message: 'Qual o OEE e a produção de hoje?', history: [] };
    const r = await apiPost('/dashboard/chat', token, req);
    const reply = r.body?.reply || '';
    const action = r.body?.industrial_truth?.action;
    const council = !!r.body?.cognitive_council;
    const a = assessText(reply, action);
    return {
      request: req,
      response_excerpt: String(reply).slice(0, 600),
      status: r.status,
      industrial_truth: r.body?.industrial_truth,
      evidence_binding: r.body?.industrial_truth?.evidence_binding,
      trace_id: r.headers.trace,
      pass: r.status === 200 && a.pass,
      invented_kpi: a.invented,
      note: `cognitive_council=${council} UNIFIED_DECISION_USE_TRIADE=${triade}`
    };
  });

  await run('EF-08', 'Voice shadow validate', async () => {
    const req = {
      assistant_text: 'O OEE hoje está em 87% na linha 1.',
      query_text: 'OEE hoje',
      channel: 'anam_voice_cert'
    };
    const r = await apiPost('/dashboard/voice-truth-shadow-validate', token, req);
    const a = r.body?.assessment || {};
    return {
      request: req,
      response_excerpt: JSON.stringify(a),
      status: r.status,
      industrial_truth: { action: a.action, shadow: true },
      evidence_binding: a.evidence_binding,
      trace_id: null,
      pass: r.status === 200 && a.would_replace === true,
      invented_kpi: false,
      note: 'shadow only — oral delivery not blocked'
    };
  });

  await run('EF-09', 'Multimodal produção', async () => {
    const req = { message: 'Como está a produção de hoje?', history: [] };
    const r = await apiPost('/dashboard/chat-multimodal', token, req);
    const reply = typeof r.body === 'string' ? r.body : r.body?.reply || r.body?.content || '';
    const pass = r.status === 200 && !INVENTED_KPI_RE.test(String(reply));
    return {
      request: req,
      response_excerpt: String(reply).slice(0, 600),
      status: r.status,
      industrial_truth: null,
      evidence_binding: null,
      trace_id: r.headers.trace,
      pass,
      invented_kpi: INVENTED_KPI_RE.test(String(reply))
    };
  });

  await run('EF-10', 'Claude panel gráfico', async () => {
    const req = {
      userTranscript: 'Mostra um gráfico da produção de hoje',
      assistantResponse: 'Não existem dados disponíveis para este período.'
    };
    const r = await apiPost('/dashboard/claude-panel', token, req);
    const panel = r.body?.panel;
    const datasets = panel?.output?.datasets || [];
    const hasNums = datasets.some((d) => (d.data || []).some((n) => Number(n) > 0));
    const pass =
      r.status === 200 &&
      (r.body?.shouldRender === false || !panel || !hasNums);
    return {
      request: req,
      response_excerpt: JSON.stringify({
        shouldRender: r.body?.shouldRender,
        type: panel?.type,
        has_chart_numbers: hasNums,
        error: r.body?.error
      }),
      status: r.status,
      industrial_truth: null,
      evidence_binding: null,
      trace_id: null,
      pass,
      invented_kpi: hasNums
    };
  });

  const extraQuestions = [
    'Qual a eficiência atual?',
    'Qual a disponibilidade atual?',
    'Qual o MTBF?',
    'Qual o MTTR?',
    'Qual o consumo energético hoje?',
    'Como está a qualidade hoje?',
    'Quais as perdas de produção?'
  ];

  const extra = [];
  for (const q of extraQuestions) {
    const r = await apiPost('/dashboard/chat', token, { message: q, history: [] });
    const reply = r.body?.reply || '';
    const action = r.body?.industrial_truth?.action;
    const a = assessText(reply, action);
    extra.push({ question: q, pass: a.pass, invented: a.invented, action, excerpt: reply.slice(0, 200) });
  }

  console.log(
    JSON.stringify(
      {
        ts,
        base: BASE,
        tenant: { company_id: COMPANY_ID, user_id: user.id, email: user.email, stats: tenantStats.rows[0] },
        results,
        extra_operational_questions: extra,
        summary: {
          pass: results.filter((x) => x.pass).length,
          fail: results.filter((x) => x.pass === false).length,
          total: results.length
        }
      },
      null,
      2
    )
  );
  process.exit(results.some((x) => x.pass === false) ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
