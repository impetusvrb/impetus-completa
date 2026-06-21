#!/usr/bin/env node
/**
 * CERT Parte 7.2 — Quality: NC → CAPA (E2E + evidências)
 *
 * Fluxo comprovado:
 *   1. POST /api/quality-intelligence/inspections (result=non_conforming) → quality_inspections
 *   2. POST /api/internal/quality-universal/workflows/instance (ncr_universal)
 *   3. POST transition submit → quality.ncr.opened + audit chain
 *   4. POST workflows/instance (capa_universal) vinculada à NC
 *   5. POST transition submit → quality.capa.created
 *   6. Isolamento tenant B → 403/vazio
 *
 * Saída: backend/docs/evidence/quality/nc-create/
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
const UA = 'cert-e2e-quality-nc-capa';
const EVIDENCE_DIR = path.join(__dirname, '../../docs/evidence/quality/nc-create');
const RUN_ID = `cert-${Date.now()}`;

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
    SELECT u.id, u.name, u.role, u.company_id, c.name AS company_name
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.role IN ('gerente','diretor','admin')
      AND u.deleted_at IS NULL AND u.active IS NOT FALSE AND c.active = true
    ORDER BY u.role = 'gerente' DESC, u.created_at DESC
    LIMIT 1
  `);
  if (!actor.rows[0]) throw new Error('Nenhum gerente/diretor/admin activo');

  const admin = await db.query(`
    SELECT u.id, u.name, u.role, u.company_id
    FROM users u
    WHERE u.company_id = $1 AND u.role = 'admin' AND u.deleted_at IS NULL AND u.active IS NOT FALSE
    LIMIT 1
  `, [actor.rows[0].company_id]);

  const otherTenant = await db.query(`
    SELECT u.id, u.name, u.company_id
    FROM users u
    WHERE u.company_id <> $1 AND u.deleted_at IS NULL AND u.active IS NOT FALSE
      AND u.role IN ('gerente','admin','diretor')
    LIMIT 1
  `, [actor.rows[0].company_id]);

  return {
    actor: actor.rows[0],
    admin: admin.rows[0] || actor.rows[0],
    other: otherTenant.rows[0] || null
  };
}

async function main() {
  const report = {
    run_id: RUN_ID,
    started_at: new Date().toISOString(),
    scenario: 'Quality NC → CAPA',
    steps: [],
    ok: false,
    classification: {}
  };

  const users = await pickUsers();
  report.users = {
    actor: { name: users.actor.name, role: users.actor.role, company_id: users.actor.company_id },
    admin: { name: users.admin.name, role: users.admin.role },
    other_tenant: users.other ? { name: users.other.name, company_id: users.other.company_id } : null
  };

  const actorSession = await auth.createSession(users.actor.id, HOST, UA, 1);
  const adminSession = await auth.createSession(users.admin.id, HOST, UA, 1);
  const otherSession = users.other ? await auth.createSession(users.other.id, HOST, UA, 1) : null;

  const correlationId = uuidv4();
  const lotNumber = `CERT-NC-${RUN_ID.slice(-8)}`;

  // Step 1 — NC via inspeção não conforme
  const ncRequest = {
    inspection_date: new Date().toISOString().slice(0, 10),
    inspection_type: 'cert_e2e_process',
    lot_number: lotNumber,
    result: 'non_conforming',
    defects_count: 3,
    defects_description: `[CERT-E2E ${RUN_ID}] Desvio dimensional detectado em linha piloto.`,
    corrective_action: `[CERT-E2E] CAPA pendente — acção correctiva de contenção.`
  };

  const inspRes = await httpJson(
    'POST',
    '/api/quality-intelligence/inspections',
    actorSession.token,
    ncRequest
  );
  report.steps.push({ step: '1_nc_inspection', status: inspRes.status, endpoint: 'POST /api/quality-intelligence/inspections' });
  writeEvidence('request.json', { ...ncRequest, _redacted: 'PII-free cert payload' });
  writeEvidence('response_inspection.json', inspRes);

  if (inspRes.status !== 200 || !inspRes.body?.inspection?.id) {
    report.error = 'Falha ao criar inspeção NC';
    writeEvidence('report.json', report);
    await cleanup();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const inspectionId = inspRes.body.inspection.id;

  const dbInsp = await db.query(
    'SELECT id, company_id, result, lot_number, corrective_action FROM quality_inspections WHERE id = $1',
    [inspectionId]
  );
  writeEvidence('db_row_inspection.json', dbInsp.rows[0] || null);
  writeEvidence('db_verify.sql', `-- NC inspection\nSELECT id, company_id, result, lot_number FROM quality_inspections WHERE id = '${inspectionId}';`);

  // Step 2 — NCR workflow instance
  const ncrCreateBody = {
    workflow_key: 'ncr_universal',
    correlation_id: correlationId,
    idempotency_key: `cert:ncr:${RUN_ID}`,
    context: {
      inspection_id: inspectionId,
      lot_number: lotNumber,
      origin: 'cert_e2e',
      severity: 'major'
    }
  };

  const ncrRes = await httpJson(
    'POST',
    '/api/internal/quality-universal/workflows/instance',
    adminSession.token,
    ncrCreateBody
  );
  report.steps.push({ step: '2_ncr_instance', status: ncrRes.status });
  writeEvidence('response_ncr_create.json', ncrRes);

  if (ncrRes.status !== 200 || !ncrRes.body?.instance?.id) {
    report.error = 'Falha ao criar instância NCR workflow';
    writeEvidence('report.json', report);
    await cleanup();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const ncrInstanceId = ncrRes.body.instance.id;

  // Step 3 — NCR transition submit (opened → under_review, event quality.ncr.opened)
  const ncrTransBody = {
    instance_id: ncrInstanceId,
    action: 'submit',
    context_patch: { submitted_by: users.actor.name, cert_run: RUN_ID },
    payload: { inspection_id: inspectionId }
  };

  const ncrTrans = await httpJson(
    'POST',
    '/api/internal/quality-universal/workflows/transition',
    adminSession.token,
    ncrTransBody
  );
  report.steps.push({ step: '3_ncr_transition_submit', status: ncrTrans.status, event: ncrTrans.body?.event_emitted });
  writeEvidence('response_ncr_transition.json', ncrTrans);

  // Step 4 — CAPA workflow vinculada
  const capaCreateBody = {
    workflow_key: 'capa_universal',
    correlation_id: correlationId,
    idempotency_key: `cert:capa:${RUN_ID}`,
    context: {
      ncr_instance_id: ncrInstanceId,
      inspection_id: inspectionId,
      root_cause_hypothesis: 'Variação de processo — cert E2E',
      linked_nc: lotNumber
    }
  };

  const capaRes = await httpJson(
    'POST',
    '/api/internal/quality-universal/workflows/instance',
    adminSession.token,
    capaCreateBody
  );
  report.steps.push({ step: '4_capa_instance', status: capaRes.status });
  writeEvidence('response_capa_create.json', capaRes);

  if (capaRes.status !== 200 || !capaRes.body?.instance?.id) {
    report.error = 'Falha ao criar instância CAPA';
    writeEvidence('report.json', report);
    await cleanup();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const capaInstanceId = capaRes.body.instance.id;

  // Step 5 — CAPA transition submit (draft → in_progress, quality.capa.created)
  const capaTrans = await httpJson(
    'POST',
    '/api/internal/quality-universal/workflows/transition',
    adminSession.token,
    {
      instance_id: capaInstanceId,
      action: 'submit',
      context_patch: { capa_owner: users.actor.name },
      payload: { ncr_instance_id: ncrInstanceId }
    }
  );
  report.steps.push({ step: '5_capa_transition_submit', status: capaTrans.status, event: capaTrans.body?.event_emitted });
  writeEvidence('response_capa_transition.json', capaTrans);

  // DB verify workflows + audit
  const wfRows = await db.query(
    `SELECT id, current_state, correlation_id, context
     FROM impetus_quality_workflow_instance
     WHERE company_id = $1 AND id = ANY($2::uuid[])`,
    [users.actor.company_id, [ncrInstanceId, capaInstanceId]]
  );
  writeEvidence('db_row_workflows.json', wfRows.rows);

  const auditRows = await db.query(
    `SELECT event_type, correlation_id, workflow_id, created_at
     FROM impetus_quality_audit_chain
     WHERE company_id = $1 AND correlation_id = $2
     ORDER BY created_at DESC LIMIT 10`,
    [users.actor.company_id, correlationId]
  );
  writeEvidence('db_row_audit.json', auditRows.rows);
  writeEvidence('log_excerpt.txt', `[CERT-E2E ${RUN_ID}] NC inspection=${inspectionId} ncr=${ncrInstanceId} capa=${capaInstanceId} correlation=${correlationId}`);

  // Step 6 — Tenant isolation
  let isolation = { tested: false, ok: false };
  if (otherSession) {
    const leak = await httpJson(
      'GET',
      `/api/quality-intelligence/inspections?limit=5&since=2000-01-01`,
      otherSession.token
    );
    const ids = (leak.body?.inspections || []).map((i) => i.id);
    isolation = {
      tested: true,
      ok: !ids.includes(inspectionId),
      other_status: leak.status,
      leaked: ids.includes(inspectionId)
    };
  }
  report.isolation = isolation;
  writeEvidence('tenant_isolation.json', isolation);

  const allOk =
    inspRes.status === 200 &&
    ncrRes.status === 200 &&
    ncrTrans.status === 200 &&
    capaRes.status === 200 &&
    capaTrans.status === 200 &&
    ncrTrans.body?.event_emitted === 'quality.ncr.opened' &&
    capaTrans.body?.event_emitted === 'quality.capa.created' &&
    dbInsp.rows[0]?.company_id === users.actor.company_id &&
    (isolation.tested ? isolation.ok : true);

  report.ok = allOk;
  report.finished_at = new Date().toISOString();
  report.classification = {
    'POST /api/quality-intelligence/inspections (NC)': allOk ? 'VERDE' : 'INCOMPLETO',
    'POST /api/internal/quality-universal/workflows/* (NCR+CAPA)': allOk ? 'VERDE' : 'AMARELO',
    'QualityGovernanceHub NcrCapaPanel (UI)': 'INCOMPLETO',
    evidence: 'backend/docs/evidence/quality/nc-create/'
  };

  writeEvidence('report.json', report);
  writeEvidence('screenshot.txt', `[Placeholder] UI NcrCapaPanel ainda stub — fluxo backend comprovado via API.\nRota: /app/quality/operational?view=ncr\nRun: ${RUN_ID}`);

  await cleanup();
  console.log(JSON.stringify({ ok: allOk, report_path: EVIDENCE_DIR, steps: report.steps.length }, null, 2));
  process.exit(allOk ? 0 : 1);
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
