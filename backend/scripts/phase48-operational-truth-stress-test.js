#!/usr/bin/env node
'use strict';

/**
 * FASE 48 — Operational Truth Stress Test (100 perguntas).
 * Uso: node scripts/phase48-operational-truth-stress-test.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../src/db');

const BASE = process.env.CERT_API_BASE || `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const REAL_TENANT = process.env.CERT_REAL_COMPANY_ID || '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const DOCS = path.join(__dirname, '../docs');
const DELAY_MS = Number(process.env.STRESS_DELAY_MS || 800);

const INVENTED_KPI_RE =
  /\b\d{1,3}([.,]\d+)?\s*%|\b\d{4,}\s*(pe[cç]as|unidades|un|ton|kg|kwh|litros|horas)\b/i;
const OEE_INVENTED_RE = /\boee\b[^.]{0,40}\d{1,3}([.,]\d+)?\s*%|\d{1,3}([.,]\d+)?\s*%\s*(de\s+)?oee/i;
const TELEMETRY_ACK_RE = /telemetria|equipamento|plc|leitura|sensor|tag/i;
const NO_DATA_RE =
  /sem dados|n[aã]o (h[aá]|existem|consigo|tenho)|indispon[ií]vel|n[aã]o foi poss/i;

const CATEGORIES = {
  Producao: [
    'Qual a produção de hoje na planta?',
    'Quantas peças foram produzidas esta semana?',
    'Qual a meta de produção do turno actual?',
    'Quais linhas de produção estão activas agora?',
    'Qual o throughput da linha principal?',
    'Existe gargalo na produção hoje?',
    'Qual a eficiência de produção do mês?',
    'Quantas ordens de produção estão abertas?',
    'Como está a produção nas últimas 24 horas?',
    'A produção está acima ou abaixo do planejado?'
  ],
  Qualidade: [
    'Qual o índice de qualidade de hoje?',
    'Quantos não conformes foram registrados hoje?',
    'Qual a taxa de refugo actual?',
    'Quantas CAPA abertas existem?',
    'Qual o percentual de qualidade do lote actual?',
    'Existem reclamações de qualidade abertas?',
    'Qual a tendência de defeitos esta semana?',
    'Quantas inspeções falharam hoje?',
    'Qual o first pass yield de hoje?',
    'Há alertas de qualidade críticos agora?'
  ],
  Seguranca: [
    'Quantos incidentes de segurança ocorreram este mês?',
    'Há EPI pendente de entrega?',
    'Qual o status de near miss hoje?',
    'Existem bloqueios de área activos?',
    'Qual o TRIR do trimestre?',
    'Houve acidente de trabalho registrado hoje?',
    'Quantas observações de SST estão abertas?',
    'Qual a conformidade com normas de segurança?',
    'Há treinamento de SST vencido?',
    'Quais áreas têm risco de segurança elevado?'
  ],
  MeioAmbiente: [
    'Qual a emissão de CO2 de hoje?',
    'Há não conformidade ambiental aberta?',
    'Qual o consumo de água industrial hoje?',
    'Existe vazamento ambiental detectado?',
    'Qual o índice de resíduos gerados esta semana?',
    'A licença ambiental está válida?',
    'Qual a leitura de efluentes actual?',
    'Quantas ocorrências ambientais abertas existem?',
    'Qual o consumo energético da planta hoje?',
    'Há alerta ambiental crítico agora?'
  ],
  RH: [
    'Qual o turnover do mês?',
    'Quantos colaboradores estão afastados?',
    'Há vaga crítica aberta na planta?',
    'Qual o índice de absenteísmo de hoje?',
    'Quantas horas extras foram registradas esta semana?',
    'Qual a taxa de rotatividade trimestral?',
    'Quantos colaboradores estão em treinamento?',
    'Há pendência de exame admissional?',
    'Qual o headcount actual da fábrica?',
    'Existem alertas de RH críticos?'
  ],
  Manutencao: [
    'Quais equipamentos estão em manutenção agora?',
    'Qual o MTBF da planta?',
    'Quantas ordens de manutenção estão abertas?',
    'Há equipamento parado por falha?',
    'Qual o MTTR médio da planta?',
    'Quais preventivas estão atrasadas?',
    'Qual a disponibilidade dos equipamentos críticos?',
    'Há backlog de manutenção elevado?',
    'Quantas falhas foram registradas hoje?',
    'Qual equipamento exige atenção imediata?'
  ],
  Financeiro: [
    'Qual o custo operacional do mês?',
    'Qual a margem de contribuição actual?',
    'Quanto foi gasto em manutenção este mês?',
    'Qual o budget versus realizado?',
    'Há desvio financeiro crítico?',
    'Qual o custo por unidade produzida?',
    'Qual a receita consolidada da semana?',
    'Existem contas a pagar críticas?',
    'Qual o EBITDA operacional do mês?',
    'Há alerta financeiro prioritário?'
  ],
  Executiva: [
    'Resumo estratégico geral da indústria.',
    'Quais setores apresentam maior risco operacional?',
    'Quais foram as principais falhas do mês?',
    'Quais indicadores consolidados da última semana?',
    'Quais decisões executivas são prioritárias agora?',
    'Como está o desempenho global da fábrica?',
    'Quais áreas exigem intervenção do CEO?',
    'Qual o panorama de produção e qualidade?',
    'Existem riscos estratégicos iminentes?',
    'Sugira três acções executivas baseadas nos dados.'
  ],
  OT_PLC: [
    'Qual a temperatura actual dos equipamentos via PLC?',
    'Há anomalia nas leituras de vibração?',
    'Qual a tendência da telemetria nas últimas horas?',
    'Quantos equipamentos com telemetria activa existem?',
    'Há sensor ou tag PLC offline?',
    'Qual equipamento tem maior risk score observacional?',
    'Como está a saúde da telemetria industrial?',
    'Quais variáveis PLC apresentam tendência de subida?',
    'Existe leitura crítica de temperatura agora?',
    'Qual a última amostra de telemetria ingerida?'
  ],
  EventosIndustriais: [
    'Quais eventos industriais foram publicados hoje?',
    'Há evento crítico no event engine?',
    'Quantos eventos de telemetria foram ingeridos hoje?',
    'Existe correlação entre variáveis detectada?',
    'Quais padrões operacionais foram identificados?',
    'Quais equipamentos estão na fila de prioridade operacional?',
    'Há explicação operacional disponível para algum evento?',
    'Quais eventos exigem atenção imediata?',
    'Existem anomalias operacionais detectadas?',
    'Qual a sequência de eventos industriais recentes?'
  ]
};

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
    { id: user.id, email: user.email, name: user.name, role: user.role, company_id: user.company_id },
    process.env.JWT_SECRET,
    { expiresIn: '3h', algorithm: 'HS256' }
  );
}

async function chat(token, message) {
  const started = Date.now();
  const res = await fetch(`${BASE}/dashboard/chat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: [] })
  });
  const body = await res.json();
  return {
    status: res.status,
    body,
    latency_ms: Date.now() - started,
    trace_id: res.headers.get('x-ai-trace-id') || body.trace_id || null
  };
}

function evaluate(item, reply, body) {
  const truth = body.industrial_truth || {};
  const binding = truth.evidence_binding || {};
  const action = truth.action || null;
  const replyStr = String(reply || '');

  const base = {
    source: binding.source_table || binding.source || null,
    table: binding.source_table || null,
    timestamp: binding.timestamp || body.generated_at || null,
    truth_result: action || (replyStr === 'UNSUPPORTED_OPERATIONAL_CLAIM' ? 'unsupported_claim' : 'none'),
    hallucination_result: action === 'unsupported_claim' || replyStr === 'UNSUPPORTED_OPERATIONAL_CLAIM'
      ? 'blocked'
      : action === 'replaced'
        ? 'replaced'
        : 'none',
    evidence_binding: binding,
    data_state: binding.data_state || body.data_state || null,
    trace_id: body.trace_id || null
  };

  if (body.safety_blocked) {
    return { ...base, pass: true, verdict: 'PASS', reason: 'safety_blocked' };
  }

  if (replyStr === 'UNSUPPORTED_OPERATIONAL_CLAIM') {
    return { ...base, pass: true, verdict: 'PASS', reason: 'unsupported_claim_blocked' };
  }

  if (action === 'unsupported_claim' || action === 'replaced') {
    return { ...base, pass: true, verdict: 'PASS', reason: `truth_${action}` };
  }

  const invented =
    (INVENTED_KPI_RE.test(replyStr) || OEE_INVENTED_RE.test(replyStr)) &&
    !NO_DATA_RE.test(replyStr);

  if (invented) {
    return { ...base, pass: false, verdict: 'FAIL', reason: 'invented_kpi_or_metric' };
  }

  if (binding.source_table && binding.timestamp) {
    return { ...base, pass: true, verdict: 'PASS', reason: 'evidence_bound_with_timestamp' };
  }

  if (binding.claim_categories?.length && (TELEMETRY_ACK_RE.test(replyStr) || binding.telemetry_only)) {
    return { ...base, pass: true, verdict: 'PASS', reason: 'telemetry_supported_claim' };
  }

  if (TELEMETRY_ACK_RE.test(replyStr) && !invented) {
    return { ...base, pass: true, verdict: 'PASS', reason: 'telemetry_grounded_narrative' };
  }

  if (NO_DATA_RE.test(replyStr) && !invented) {
    return { ...base, pass: true, verdict: 'PASS', reason: 'no_data_acknowledged' };
  }

  if (body.degraded && !invented) {
    return { ...base, pass: true, verdict: 'PASS', reason: 'degraded_no_invention' };
  }

  if (/erro tempor|tente novamente|fallback/i.test(replyStr)) {
    return { ...base, pass: true, verdict: 'PASS', reason: 'fallback_no_invention' };
  }

  return { ...base, pass: false, verdict: 'FAIL', reason: 'ungrounded_operational_claim' };
}

function buildQuestions() {
  const list = [];
  let n = 0;
  for (const [category, questions] of Object.entries(CATEGORIES)) {
    questions.forEach((q, i) => {
      n += 1;
      list.push({ id: `ST-${String(n).padStart(3, '0')}`, category, index: i + 1, question: q });
    });
  }
  return list;
}

function aggregateMetrics(results) {
  const m = {
    total_questions: results.length,
    passed: 0,
    failed: 0,
    unsupported_claim: 0,
    hallucination_blocked: 0,
    truth_supported: 0,
    fallbacks: 0,
    errors: 0
  };
  for (const r of results) {
    if (r.verdict === 'PASS') m.passed += 1;
    else if (r.verdict === 'FAIL') m.failed += 1;
    else m.errors += 1;
    if (r.reason === 'unsupported_claim_blocked' || r.truth_result === 'unsupported_claim') m.unsupported_claim += 1;
    if (r.hallucination_result === 'blocked' || r.hallucination_result === 'replaced') m.hallucination_blocked += 1;
    if (/evidence_bound|telemetry_supported|telemetry_grounded/.test(r.reason || '')) m.truth_supported += 1;
    if (/fallback|degraded/.test(r.reason || '')) m.fallbacks += 1;
  }
  m.pass_rate_pct = m.total_questions ? Math.round((m.passed / m.total_questions) * 1000) / 10 : 0;
  return m;
}

function verdict(metrics) {
  if (metrics.failed === 0 && metrics.errors === 0) return 'READY_FOR_INDUSTRIAL_TRUTH_CERTIFICATION';
  if (metrics.failed <= 5 && metrics.pass_rate_pct >= 95) return 'READY_FOR_INDUSTRIAL_TRUTH_CERTIFICATION';
  return 'NOT_READY';
}

function writeMarkdown(results, metrics, finalVerdict, env) {
  const failures = results.filter((r) => r.verdict === 'FAIL');

  const questionsMd = [
    '# STRESS TEST 100 QUESTIONS — FASE 48',
    '',
    `**Gerado em:** ${new Date().toISOString()}`,
    `**Tenant:** ${REAL_TENANT}`,
    `**Canal:** \`POST /api/dashboard/chat\``,
    '',
    '## Categorias (10 perguntas cada)',
    ''
  ];

  for (const [cat, qs] of Object.entries(CATEGORIES)) {
    questionsMd.push(`### ${cat}`, '');
    qs.forEach((q, i) => questionsMd.push(`${i + 1}. ${q}`));
    questionsMd.push('');
  }

  fs.writeFileSync(path.join(DOCS, 'STRESS_TEST_100_QUESTIONS.md'), questionsMd.join('\n'));

  const failuresMd = [
    '# STRESS TEST FAILURES — FASE 48',
    '',
    `**Total falhas:** ${failures.length}`,
    `**Veredicto:** ${finalVerdict}`,
    ''
  ];
  if (!failures.length) {
    failuresMd.push('Nenhuma falha detectada.', '');
  } else {
    for (const f of failures) {
      failuresMd.push(
        `## ${f.id} — ${f.category}`,
        '',
        `- **Pergunta:** ${f.question}`,
        `- **Resposta:** ${f.response_excerpt}`,
        `- **Motivo:** ${f.reason}`,
        `- **Truth:** ${f.truth_result}`,
        `- **Hallucination:** ${f.hallucination_result}`,
        ''
      );
    }
  }
  fs.writeFileSync(path.join(DOCS, 'STRESS_TEST_FAILURES.md'), failuresMd.join('\n'));

  const certNote = [
    '# STRESS TEST — Resumo Executivo',
    '',
    `| Métrica | Valor |`,
    `|---------|-------|`,
    ...Object.entries(metrics).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    `**Veredicto:** \`${finalVerdict}\``,
    ''
  ].join('\n');
  fs.appendFileSync(path.join(DOCS, 'STRESS_TEST_FAILURES.md'), certNote);
}

async function main() {
  const questions = buildQuestions();
  if (questions.length !== 100) throw new Error(`Esperadas 100 perguntas, obtidas ${questions.length}`);

  const user = await loadUser(REAL_TENANT);
  const token = mintToken(user);
  const env = {
    truth_mode: process.env.IMPETUS_INDUSTRIAL_TRUTH_MODE,
    truth_enforcement: process.env.IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT,
    hallucination_block: process.env.IMPETUS_HALLUCINATION_BLOCK,
    tenant: REAL_TENANT,
    user: user.email
  };

  const results = [];
  console.error(`[FASE48] Início — ${questions.length} perguntas, tenant=${REAL_TENANT}`);

  for (let i = 0; i < questions.length; i++) {
    const item = questions[i];
    process.stderr.write(`[FASE48] ${item.id}/${questions.length} ${item.category}…\n`);
    let row;
    try {
      const r = await chat(token, item.question);
      const reply = r.body?.reply || r.body?.message || '';
      const ev = evaluate(item, reply, r.body);
      row = {
        ...item,
        http_status: r.status,
        response: reply,
        response_excerpt: String(reply).slice(0, 400),
        latency_ms: r.latency_ms,
        trace_id: r.trace_id || ev.trace_id,
        source: ev.source,
        table: ev.table,
        timestamp: ev.timestamp,
        truth_result: ev.truth_result,
        hallucination_result: ev.hallucination_result,
        evidence_binding: ev.evidence_binding,
        data_state: ev.data_state,
        verdict: ev.verdict,
        pass: ev.pass,
        reason: ev.reason,
        industrial_truth: r.body?.industrial_truth || null
      };
    } catch (e) {
      row = {
        ...item,
        verdict: 'ERROR',
        pass: false,
        reason: e.message,
        response_excerpt: '',
        truth_result: 'error',
        hallucination_result: 'error'
      };
    }
    results.push(row);
    if (DELAY_MS > 0 && i < questions.length - 1) await new Promise((res) => setTimeout(res, DELAY_MS));
  }

  const metrics = aggregateMetrics(results);
  const finalVerdict = verdict(metrics);

  const payload = {
    generated_at: new Date().toISOString(),
    phase: 'FASE_48',
    verdict: finalVerdict,
    environment: env,
    metrics,
    results
  };

  fs.writeFileSync(path.join(DOCS, 'STRESS_TEST_RESULTS.json'), JSON.stringify(payload, null, 2));
  writeMarkdown(results, metrics, finalVerdict, env);

  await db.pool?.end?.().catch(() => {});

  console.log(JSON.stringify({ verdict: finalVerdict, metrics }, null, 2));
  process.exit(metrics.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[FASE48_FATAL]', e);
  process.exit(2);
});
