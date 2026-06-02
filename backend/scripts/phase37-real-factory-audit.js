#!/usr/bin/env node
'use strict';

/**
 * FASE 37 — Real Factory Certification (read-only audit).
 * Uso: node scripts/phase37-real-factory-audit.js
 * Saída: JSON em stdout (redireccionar logs stderr se necessário).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const db = require('../src/db');

const BASE = process.env.CERT_API_BASE || `http://127.0.0.1:${process.env.PORT || 4000}/api`;
const INVENTED_KPI_RE = /\b\d{1,3}([.,]\d+)?\s*%|\b\d{4,}\s*(pe[cç]as|un|ton|kg|kwh)/i;

async function safeQuery(sql, params = []) {
  try {
    const r = await db.query(sql, params);
    return { ok: true, rows: r.rows };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function tableExists(name) {
  const r = await safeQuery(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [name]
  );
  return r.ok && r.rows.length > 0;
}

async function inventoryIndustrialBackbone() {
  const inv = { tables: {}, counts: {} };

  const tables = [
    'plc_collected_data',
    'plc_devices',
    'plc_tags',
    'communications',
    'mqtt_broker_configs',
    'mqtt_subscriptions',
    'mqtt_message_log',
    'modbus_connections',
    'modbus_registers',
    'opcua_endpoints',
    'opcua_nodes',
    'edge_agents',
    'edge_runtime_heartbeats',
    'quality_non_conformities',
    'quality_capa',
    'production_orders',
    'production_shifts',
    'safety_incidents',
    'environment_readings',
    'maintenance_work_orders',
    'manuia_machines'
  ];

  for (const t of tables) {
    inv.tables[t] = await tableExists(t);
    if (inv.tables[t]) {
      const c = await safeQuery(`SELECT COUNT(*)::bigint AS c FROM ${t}`);
      inv.counts[t] = c.ok ? Number(c.rows[0]?.c || 0) : null;
    }
  }

  const tenantsPlc = await safeQuery(`
    SELECT company_id, COUNT(*)::int AS plc_rows_30d,
           MAX(collected_at) AS last_collected
    FROM plc_collected_data
    WHERE collected_at > NOW() - INTERVAL '30 days'
    GROUP BY company_id
    ORDER BY plc_rows_30d DESC
    LIMIT 15
  `);

  inv.tenants_with_plc_30d = tenantsPlc.ok ? tenantsPlc.rows : [];

  const comms = await safeQuery(`
    SELECT company_id, COUNT(*)::int AS comm_rows_30d
    FROM communications
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY company_id
    ORDER BY comm_rows_30d DESC
    LIMIT 10
  `);
  inv.tenants_with_comms_30d = comms.ok ? comms.rows : [];

  return inv;
}

async function voiceShadowStats() {
  const r = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE (description::jsonb->>'would_replace')::boolean IS TRUE)::int AS would_replace,
      COUNT(*) FILTER (WHERE (description::jsonb->>'would_block')::boolean IS TRUE)::int AS would_block,
      ROUND(AVG(NULLIF((description::jsonb->>'confidence')::float, 0))::numeric, 4) AS avg_confidence,
      MIN(created_at) AS first_at,
      MAX(created_at) AS last_at
    FROM audit_logs
    WHERE action = 'voice_truth_shadow'
      AND created_at > NOW() - INTERVAL '7 days'
  `);
  return r.ok ? r.rows[0] : { error: r.error };
}

async function hallucinationStats() {
  const diag = require('../src/services/hallucinationDetectionService').getDiagnostics();
  let assess = null;
  const a = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE requires_human_review = true AND COALESCE(false_positive_marked, false) = false)::int AS review_pending,
      COUNT(*) FILTER (WHERE COALESCE(false_positive_marked, false) = true)::int AS false_positives,
      ROUND(AVG(confidence_score)::numeric, 4) AS avg_confidence
    FROM ai_hallucination_assessments
  `);
  if (a.ok) assess = a.rows[0];

  let traces = null;
  const t = await safeQuery(`
    SELECT COUNT(*)::int AS total_traces
    FROM ai_traces
    WHERE created_at > NOW() - INTERVAL '30 days'
  `);
  if (t.ok) traces = t.rows[0];

  const tracesWithTruth = await safeQuery(`
    SELECT COUNT(*)::int AS cnt
    FROM ai_traces
    WHERE created_at > NOW() - INTERVAL '30 days'
      AND output_response::text ILIKE '%industrial_truth%'
  `);

  return {
    diagnostics: diag,
    assessments: assess,
    traces_30d: traces,
    traces_with_industrial_truth_30d: tracesWithTruth.ok ? tracesWithTruth.rows[0] : null
  };
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
    json = { _raw: text.slice(0, 400) };
  }
  return {
    status: res.status,
    headers: { trace: res.headers.get('x-ai-trace-id') },
    body: json
  };
}

async function loadUserForCompany(companyId) {
  const r = await db.query(
    `SELECT * FROM users WHERE company_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`,
    [companyId]
  );
  return r.rows[0] || null;
}

async function tenantOperationalSnapshot(companyId) {
  const plc = await safeQuery(
    `SELECT COUNT(*)::int AS c, MAX(collected_at) AS last_at
     FROM plc_collected_data WHERE company_id = $1 AND collected_at > NOW() - INTERVAL '7 days'`,
    [companyId]
  );
  const comm = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM communications WHERE company_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
    [companyId]
  );
  const nc = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM quality_non_conformities WHERE company_id = $1`,
    [companyId]
  );
  const wo = await safeQuery(
    `SELECT COUNT(*)::int AS c FROM maintenance_work_orders WHERE company_id = $1`,
    [companyId]
  );
  return {
    plc_7d: plc.ok ? plc.rows[0] : null,
    comm_30d: comm.ok ? comm.rows[0] : null,
    quality_nc: nc.ok ? nc.rows[0] : null,
    maintenance_wo: wo.ok ? wo.rows[0] : null
  };
}

async function runTruthQuestions(companyId) {
  const user = await loadUserForCompany(companyId);
  if (!user) return { skipped: true, reason: 'no_active_user' };

  const token = mintToken(user);
  const questions = [
    { id: 'RF-01', q: 'Qual o OEE atual?', channel: 'dashboard/chat' },
    { id: 'RF-02', q: 'Como está a produção de hoje?', channel: 'dashboard/chat' },
    { id: 'RF-03', q: 'Como está a qualidade hoje?', channel: 'dashboard/chat' },
    { id: 'RF-04', q: 'Quais as paradas de produção hoje?', channel: 'dashboard/chat' },
    { id: 'RF-05', q: 'Qual o MTBF da planta?', channel: 'dashboard/chat' },
    { id: 'RF-06', q: 'Qual o MTTR médio?', channel: 'dashboard/chat' },
    { id: 'RF-07', q: 'Qual o consumo energético hoje?', channel: 'dashboard/chat' },
    { id: 'RF-08', q: 'Qual o índice de refugo?', channel: 'dashboard/chat' },
    { id: 'RF-09', q: 'Quantas CAPA abertas existem?', channel: 'dashboard/chat' },
    { id: 'RF-10', q: 'Quais alarmes críticos agora?', channel: 'dashboard/chat' }
  ];

  const results = [];
  for (const item of questions) {
    const path = item.channel === 'dashboard/chat' ? '/dashboard/chat' : '/dashboard/chat';
    const r = await apiPost(path, token, { message: item.q, history: [] });
    const reply = r.body?.reply || r.body?.message || '';
    const it = r.body?.industrial_truth || {};
    const invented = INVENTED_KPI_RE.test(String(reply)) && !/sem dados|n[aã]o existem dados|indispon/i.test(reply);
    results.push({
      id: item.id,
      question: item.q,
      status: r.status,
      pass: r.status === 200 && !invented,
      invented_kpi: invented,
      industrial_truth_action: it.action,
      evidence_binding: it.evidence_binding || null,
      trace_id: r.headers.trace,
      excerpt: String(reply).slice(0, 280)
    });
  }

  const panel = await apiPost('/dashboard/panel-command', token, {
    command: 'Gráfico de produção de hoje com dados reais'
  });
  const out = panel.body?.output || panel.body;
  const bar = out?.barData || [];
  const positive = bar.some((b) => Number(b?.valor ?? b?.value ?? 0) > 0);
  results.push({
    id: 'RF-11',
    question: 'panel-command produção',
    status: panel.status,
    pass: panel.status === 200 && (positive ? !!panel.body?.evidence_binding || !!panel.body?.industrial_truth : true),
    invented_kpi: positive && !panel.body?.industrial_truth?.truth_guard,
    industrial_truth_action: panel.body?.industrial_truth?.truth_guard?.action,
    evidence_binding: panel.body?.evidence_binding,
    trace_id: panel.headers.trace,
    excerpt: JSON.stringify({ type: out?.type, bar_positive: positive, truth_guard: out?.truth_guard }).slice(0, 280)
  });

  return { company_id: companyId, user_email: user.email, results };
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    phase: 'F37',
    env: {
      port: process.env.PORT || 4000,
      industrial_truth: process.env.IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT || 'default',
      truth_mode: process.env.IMPETUS_INDUSTRIAL_TRUTH_MODE || 'default',
      hallucination_block: process.env.IMPETUS_HALLUCINATION_BLOCK || 'off'
    },
    inventory: await inventoryIndustrialBackbone(),
    voice_shadow_7d: await voiceShadowStats(),
    hallucination: await hallucinationStats()
  };

  const topTenant = report.inventory.tenants_with_plc_30d?.[0]?.company_id;
  if (topTenant) {
    report.selected_real_factory_tenant = topTenant;
    report.tenant_snapshot = await tenantOperationalSnapshot(topTenant);
    try {
      report.truth_validation = await runTruthQuestions(topTenant);
    } catch (e) {
      report.truth_validation = { error: e.message };
    }
  } else {
    const commTenant = report.inventory.tenants_with_comms_30d?.[0]?.company_id;
    if (commTenant) {
      report.selected_real_factory_tenant = commTenant;
      report.tenant_snapshot = await tenantOperationalSnapshot(commTenant);
      try {
        report.truth_validation = await runTruthQuestions(commTenant);
      } catch (e) {
        report.truth_validation = { error: e.message };
      }
    } else {
      report.truth_validation = { skipped: true, reason: 'no_tenant_with_plc_or_comms_30d' };
    }
  }

  const passed = report.truth_validation?.results?.filter((r) => r.pass).length;
  const total = report.truth_validation?.results?.length;
  report.truth_validation_summary = total != null ? { pass: passed, total, rate: total ? passed / total : 0 } : null;

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});
