#!/usr/bin/env node
/**
 * CERT Parte 7.2 — SST: Incidente / Quase-acidente / Treinamento vencido
 *
 * Fluxo:
 *   1. POST /api/safety-operational/events (incident)
 *   2. POST near_miss
 *   3. POST training_expired (+ hr_alerts)
 *   4. GET /api/dashboard/operational-brain/alerts — 3 alertas tenant A
 *   5. Isolamento tenant B
 *
 * Saída: backend/docs/evidence/safety/lifecycle/
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../../src/db');
const auth = require('../../src/middleware/auth');

const HOST = '127.0.0.1';
const PORT = parseInt(process.env.PORT, 10) || 4000;
const UA = 'cert-e2e-sst-lifecycle';
const EVIDENCE_DIR = path.join(__dirname, '../../docs/evidence/safety/lifecycle');
const RUN_ID = `cert-sst-${Date.now()}`;

function writeEvidence(name, data) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const p = path.join(EVIDENCE_DIR, name);
  fs.writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
  return p;
}

function httpJson(method, apiPath, token, body) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        path: apiPath,
        method,
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        },
        timeout: 20000
      },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(b);
          } catch {
            json = { raw: b.slice(0, 500) };
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: -1, body: { error: 'timeout' } });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function pickUsers() {
  const actor = await db.query(`
    SELECT u.id, u.name, u.role, u.company_id
    FROM users u JOIN companies c ON c.id = u.company_id
    WHERE u.role IN ('gerente','supervisor','diretor')
      AND u.deleted_at IS NULL AND u.active IS NOT FALSE AND c.active = true
    ORDER BY u.role = 'supervisor' DESC, u.created_at DESC LIMIT 1
  `);
  if (!actor.rows[0]) throw new Error('Nenhum supervisor/gerente activo');

  const admin = await db.query(`
    SELECT u.id, u.name, u.role, u.company_id FROM users u
    WHERE u.company_id = $1 AND u.role = 'admin' AND u.deleted_at IS NULL AND u.active IS NOT FALSE LIMIT 1
  `, [actor.rows[0].company_id]);

  const other = await db.query(`
    SELECT u.id, u.name, u.company_id FROM users u
    WHERE u.company_id <> $1 AND u.deleted_at IS NULL AND u.active IS NOT FALSE
      AND u.role IN ('gerente','admin','supervisor') LIMIT 1
  `, [actor.rows[0].company_id]);

  return { actor: actor.rows[0], admin: admin.rows[0] || actor.rows[0], other: other.rows[0] || null };
}

async function main() {
  const report = {
    run_id: RUN_ID,
    started_at: new Date().toISOString(),
    scenario: 'SST Incidente / Quase-acidente / Treinamento vencido',
    steps: [],
    ok: false,
    alert_ids: []
  };

  const users = await pickUsers();
  report.users = {
    actor: { name: users.actor.name, role: users.actor.role, company_id: users.actor.company_id },
    other_tenant: users.other ? { name: users.other.name, company_id: users.other.company_id } : null
  };

  const actorSession = await auth.createSession(users.actor.id, HOST, UA, 1);
  const otherSession = users.other ? await auth.createSession(users.other.id, HOST, UA, 1) : null;
  const correlationId = uuidv4();

  const health = await httpJson('GET', '/api/safety-operational/health', actorSession.token);
  report.safety_runtime = health.body;
  report.steps.push({ step: '0_health', status: health.status, enabled: health.body?.enabled });

  if (health.status !== 200 || !health.body?.enabled) {
    report.error = 'IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED deve ser true para certificação SST';
    writeEvidence('report.json', report);
    await cleanup();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const events = [
    {
      key: 'incident',
      body: {
        kind: 'incident',
        title: `[CERT ${RUN_ID}] Incidente — queda de objeto`,
        message: 'Objeto metálico caiu de prateleira linha 2. Sem vítimas.',
        severity: 'alta',
        location: 'Linha 2 — Armazém',
        correlation_id: correlationId,
        metadata: { cert_run: RUN_ID }
      }
    },
    {
      key: 'near_miss',
      body: {
        kind: 'near_miss',
        title: `[CERT ${RUN_ID}] Quase-acidente — empilhadeira`,
        message: 'Empilhadeira passou a menos de 1m de colaborador em cruzamento.',
        severity: 'media',
        location: 'Pátio logístico',
        correlation_id: correlationId,
        metadata: { cert_run: RUN_ID }
      }
    },
    {
      key: 'training_expired',
      body: {
        kind: 'training_expired',
        title: `[CERT ${RUN_ID}] NR-35 vencida`,
        message: 'Treinamento trabalho em altura vencido — operador setor A.',
        severity: 'media',
        location: 'Setor A',
        correlation_id: correlationId,
        metadata: { cert_run: RUN_ID, nr: 'NR-35' }
      }
    }
  ];

  writeEvidence('request.json', { events: events.map((e) => e.body), correlation_id: correlationId });

  const responses = {};
  for (const ev of events) {
    const res = await httpJson('POST', '/api/safety-operational/events', actorSession.token, ev.body);
    responses[ev.key] = res;
    report.steps.push({ step: `post_${ev.key}`, status: res.status, event_id: res.body?.event?.id });
    if (res.status === 200 && res.body?.event?.id) {
      report.alert_ids.push(res.body.event.id);
    }
    writeEvidence(`response_${ev.key}.json`, res);
  }

  const allPostsOk = events.every((ev) => responses[ev.key]?.status === 200);

  const dbAlerts = await db.query(
    `SELECT id, company_id, tipo_alerta, titulo, severidade, source
     FROM operational_alerts
     WHERE company_id = $1 AND id = ANY($2::uuid[])
     ORDER BY created_at`,
    [users.actor.company_id, report.alert_ids]
  );
  writeEvidence('db_row_alerts.json', dbAlerts.rows);

  const hrTraining = await db.query(
    `SELECT id, alert_type, title, company_id FROM hr_alerts
     WHERE company_id = $1 AND alert_type = 'treinamento_vencido'
       AND title LIKE $2
     ORDER BY created_at DESC LIMIT 1`,
    [users.actor.company_id, `%${RUN_ID}%`]
  );
  writeEvidence('db_row_hr_training.json', hrTraining.rows[0] || null);

  writeEvidence(
    'db_verify.sql',
    `-- SST lifecycle cert ${RUN_ID}\n` +
      `SELECT id, tipo_alerta, titulo FROM operational_alerts WHERE company_id = '${users.actor.company_id}' AND source = 'safety_operational' ORDER BY created_at DESC LIMIT 5;\n` +
      `SELECT id, alert_type, title FROM hr_alerts WHERE company_id = '${users.actor.company_id}' AND alert_type = 'treinamento_vencido' ORDER BY created_at DESC LIMIT 3;`
  );

  const listRes = await httpJson(
    'GET',
    '/api/dashboard/operational-brain/alerts?limit=30',
    actorSession.token
  );
  writeEvidence('response_alerts_list.json', listRes);
  report.steps.push({ step: 'list_alerts', status: listRes.status, count: listRes.body?.alerts?.length });

  const listedIds = (listRes.body?.alerts || []).map((a) => String(a.id));
  const allListed = report.alert_ids.every((id) => listedIds.includes(String(id)));

  let isolation = { tested: false, ok: false };
  if (otherSession && report.alert_ids[0]) {
    const leak = await httpJson('GET', '/api/dashboard/operational-brain/alerts?limit=30', otherSession.token);
    const otherIds = (leak.body?.alerts || []).map((a) => String(a.id));
    const resolveAttempt = await httpJson(
      'POST',
      `/api/dashboard/operational-brain/alerts/${report.alert_ids[0]}/resolve`,
      otherSession.token
    );
    isolation = {
      tested: true,
      ok:
        !report.alert_ids.some((id) => otherIds.includes(String(id))) &&
        resolveAttempt.status !== 200,
      other_status: leak.status,
      resolve_status: resolveAttempt.status,
      leaked: report.alert_ids.filter((id) => otherIds.includes(String(id)))
    };
  }
  report.isolation = isolation;
  writeEvidence('tenant_isolation.json', isolation);
  writeEvidence('log_excerpt.txt', `[CERT-E2E ${RUN_ID}] SST events=${report.alert_ids.join(',')} correlation=${correlationId}`);

  const ok =
    allPostsOk &&
    report.alert_ids.length === 3 &&
    dbAlerts.rows.length === 3 &&
    hrTraining.rows.length >= 1 &&
    listRes.status === 200 &&
    allListed &&
    (isolation.tested ? isolation.ok : true);

  report.ok = ok;
  report.finished_at = new Date().toISOString();
  report.classification = {
    'POST /api/safety-operational/events': ok ? 'VERDE' : 'INCOMPLETO',
    'GET /api/dashboard/operational-brain/alerts': ok ? 'VERDE' : 'AMARELO',
    'SafetyOperationalWorkspace (UI incident)': 'INCOMPLETO',
    evidence: 'backend/docs/evidence/safety/lifecycle/'
  };

  writeEvidence('report.json', report);
  writeEvidence('screenshot.txt', `UI SafetyOperationalWorkspace incident view — placeholder; fluxo API comprovado.\nRun: ${RUN_ID}`);

  const agg = { ...responses, alerts_list: listRes };
  writeEvidence('response.json', agg);

  await cleanup();
  console.log(JSON.stringify({ ok, report_path: EVIDENCE_DIR, alert_ids: report.alert_ids }, null, 2));
  process.exit(ok ? 0 : 1);
}

async function cleanup() {
  try {
    await db.query('DELETE FROM sessions WHERE user_agent=$1', [UA]);
  } catch (_) {}
}

main().catch(async (e) => {
  writeEvidence('report.json', { ok: false, error: e.message, stack: e.stack });
  await cleanup();
  console.error(e);
  process.exit(1);
});
