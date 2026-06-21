#!/usr/bin/env node
/**
 * CERT Parte 7.2 — Domínios restantes (batch E2E + evidências)
 *
 * Executive, ManuIA, ESG, TPM, AIOI, Billing, DSR/LGPD, Event Governance
 *
 * Uso: node backend/scripts/audit/e2e_cert_part72_batch.js
 */
'use strict';

const { v4: uuidv4 } = require('uuid');
const {
  db,
  httpJson,
  evidenceDir,
  writeEvidence,
  createSession,
  cleanupSessions,
  pickUser,
  pickMaintenanceUser,
  pickOtherTenant,
  sleep,
  tenantIsolationList
} = require('./_certE2eCommon');

const UA = 'cert-e2e-part72-batch';
const RUN_ID = `cert-p72-${Date.now()}`;

async function runExecutive() {
  const dir = evidenceDir('executive', 'dashboard-profile');
  const report = { domain: 'Executive', run_id: RUN_ID, steps: [], ok: false };

  const ceo = await pickUser(['ceo', 'diretor']);
  const other = await pickOtherTenant(ceo.company_id);
  if (!ceo) throw new Error('Sem utilizador executivo');

  const ceoS = await createSession(ceo.id, UA);
  const otherS = other ? await createSession(other.id, UA) : null;

  const me = await httpJson('GET', '/api/dashboard/me', ceoS.token);
  const kpis = await httpJson('GET', '/api/dashboard/kpis', ceoS.token);
  report.steps.push({ step: 'dashboard_me', status: me.status, profile: me.body?.profile_code });
  report.steps.push({ step: 'dashboard_kpis', status: kpis.status, count: kpis.body?.kpis?.length });

  let isolation = { tested: false, ok: true };
  if (otherS) {
    const otherMe = await httpJson('GET', '/api/dashboard/me', otherS.token);
    isolation = {
      tested: true,
      ok: otherMe.status === 200 && otherMe.body?.company_id !== ceo.company_id,
      other_company: otherMe.body?.company_id
    };
  }

  report.ok = me.status === 200 && kpis.status === 200 && !!me.body?.profile_code && isolation.ok;
  report.isolation = isolation;
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/executive/dashboard-profile/';

  writeEvidence(dir, 'request.json', { endpoints: ['GET /api/dashboard/me', 'GET /api/dashboard/kpis'] });
  writeEvidence(dir, 'response_me.json', me);
  writeEvidence(dir, 'response_kpis.json', kpis);
  writeEvidence(dir, 'tenant_isolation.json', isolation);
  writeEvidence(dir, 'report.json', report);
  writeEvidence(dir, 'summary.md', `# Executive dashboard-profile\nRun: ${RUN_ID}\nProfile: ${me.body?.profile_code}\n`);
  return report;
}

async function runManuia() {
  const dir = evidenceDir('manuia', 'diagnosis-workorder');
  const report = { domain: 'ManuIA', run_id: RUN_ID, steps: [], ok: false };

  const candidates = [];
  const maint = await pickMaintenanceUser();
  if (maint) candidates.push(maint);
  for (const role of ['supervisor', 'gerente', 'coordenador']) {
    const u = await pickUser([role]);
    if (u && !candidates.find((c) => c.id === u.id)) candidates.push(u);
  }

  let conclude = { status: 403 };
  let user = null;
  const equip = `CERT-Prensa-${RUN_ID.slice(-6)}`;

  for (const u of candidates) {
    const session = await createSession(u.id, UA);
    conclude = await httpJson('POST', '/api/manutencao-ia/conclude-session', session.token, {
      equipment_name: equip,
      symptom: 'Vibração anormal',
      diagnosis_summary: `[CERT ${RUN_ID}] Rolamento desgastado — substituir`,
      create_work_order: true,
      add_to_cadastro: true,
      sector: 'Linha 1'
    });
    if (conclude.status === 200) {
      user = u;
      report.steps.push({ step: 'conclude_session', status: conclude.status, wo: conclude.body?.work_order_id, user: u.role });
      break;
    }
  }

  if (!user) {
    report.error = 'Nenhum perfil conseguiu concluir sessão ManuIA (MAINTENANCE_PROFILE_REQUIRED)';
    writeEvidence(dir, 'report.json', report);
    return report;
  }

  const session = await createSession(user.id, UA);

  let woRow = null;
  if (conclude.body?.work_order_id) {
    const r = await db.query('SELECT id, company_id, title, status FROM work_orders WHERE id = $1', [
      conclude.body.work_order_id
    ]);
    woRow = r.rows[0];
  }

  const history = await httpJson('GET', '/api/manutencao-ia/sessions', session.token);
  report.steps.push({ step: 'sessions_history', status: history.status });

  report.ok = conclude.status === 200 && !!conclude.body?.work_order_id && woRow?.company_id === user.company_id;
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/manuia/diagnosis-workorder/';

  writeEvidence(dir, 'request.json', { equipment_name: equip, create_work_order: true });
  writeEvidence(dir, 'response_conclude.json', conclude);
  writeEvidence(dir, 'response_sessions.json', history);
  writeEvidence(dir, 'db_row_work_order.json', woRow);
  writeEvidence(dir, 'report.json', report);
  return report;
}

async function runEsg() {
  const dir = evidenceDir('esg', 'emission-waste-consumption');
  const report = { domain: 'ESG', run_id: RUN_ID, steps: [], ok: false };
  const correlationId = uuidv4();

  const actor = await pickUser(['gerente', 'diretor', 'admin']);
  const session = await createSession(actor.id, UA);

  const health = await httpJson('GET', '/api/environment-operational/health', session.token);
  report.steps.push({ step: 'health', status: health.status, enabled: health.body?.enabled });

  if (!health.body?.enabled) {
    report.error = 'IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true requerido';
    writeEvidence(dir, 'report.json', report);
    return report;
  }

  const events = [
    {
      key: 'emission',
      body: {
        event_name: 'environment.emission.alert_triggered',
        correlation_id: correlationId,
        payload: { stack_id: 'CH-01', pm: 45, cert_run: RUN_ID }
      }
    },
    {
      key: 'waste',
      body: {
        event_name: 'environment.waste.manifest_created',
        correlation_id: correlationId,
        payload: { waste_class: 'IIB', mtr_ref: `MTR-${RUN_ID.slice(-8)}` }
      }
    },
    {
      key: 'water',
      body: {
        event_name: 'environment.water.sample_collected',
        correlation_id: correlationId,
        payload: { meter_id: 'ETA-1', m3: 120.5 }
      }
    }
  ];

  const responses = {};
  for (const ev of events) {
    const res = await httpJson('POST', '/api/environment-operational/events', session.token, ev.body);
    responses[ev.key] = res;
    report.steps.push({ step: `event_${ev.key}`, status: res.status });
    writeEvidence(dir, `response_${ev.key}.json`, res);
  }

  report.ok = events.every((ev) => responses[ev.key]?.status === 200);
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/esg/emission-waste-consumption/';

  writeEvidence(dir, 'request.json', { events: events.map((e) => e.body), correlation_id: correlationId });
  writeEvidence(dir, 'response.json', responses);
  writeEvidence(dir, 'report.json', report);
  return report;
}

async function runTpm() {
  const dir = evidenceDir('tpm', 'preventive-lifecycle');
  const report = { domain: 'TPM', run_id: RUN_ID, steps: [], ok: false };

  const user = (await pickMaintenanceUser()) || (await pickUser(['supervisor', 'gerente']));
  if (!user) {
    report.error = 'Sem utilizador manutenção/operacional';
    writeEvidence(dir, 'report.json', report);
    return report;
  }

  const session = await createSession(user.id, UA);
  const title = `[CERT ${RUN_ID}] Lubrificação preventiva`;

  const create = await httpJson('POST', '/api/dashboard/maintenance/preventives', session.token, {
    title,
    machine_name: 'EQ-CERT-01',
    sector: 'Linha A',
    scheduled_date: new Date().toISOString()
  });
  report.steps.push({ step: 'create_preventive', status: create.status, id: create.body?.preventive?.id });

  const prevId = create.body?.preventive?.id;
  let complete = { status: 0 };
  if (prevId) {
    complete = await httpJson('PATCH', `/api/dashboard/maintenance/preventives/${prevId}`, session.token, {
      status: 'completed'
    });
    report.steps.push({ step: 'complete_preventive', status: complete.status });
  }

  const summary = await httpJson('GET', '/api/dashboard/maintenance/summary', session.token);
  report.steps.push({ step: 'summary', status: summary.status });

  let dbRow = null;
  if (prevId) {
    const r = await db.query(
      'SELECT id, company_id, status, title FROM maintenance_preventives WHERE id = $1',
      [prevId]
    );
    dbRow = r.rows[0];
  }

  report.ok = create.status === 201 && complete.status === 200 && dbRow?.status === 'completed';
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/tpm/preventive-lifecycle/';

  writeEvidence(dir, 'request.json', { title });
  writeEvidence(dir, 'response_create.json', create);
  writeEvidence(dir, 'response_complete.json', complete);
  writeEvidence(dir, 'response_summary.json', summary);
  writeEvidence(dir, 'db_row_preventive.json', dbRow);
  writeEvidence(dir, 'report.json', report);
  return report;
}

async function runDsr() {
  const dir = evidenceDir('dsr', 'data-subject-request');
  const report = { domain: 'DSR/LGPD', run_id: RUN_ID, steps: [], ok: false };

  const colab = await pickUser(['colaborador', 'supervisor', 'coordenador']);
  const dpo = await pickUser(['diretor', 'admin'], colab?.company_id);
  if (!colab || !dpo) {
    report.error = 'Utilizadores colaborador + DPO não encontrados';
    writeEvidence(dir, 'report.json', report);
    return report;
  }

  const colabS = await createSession(colab.id, UA);
  const dpoS = await createSession(dpo.id, UA);

  const create = await httpJson('POST', '/api/lgpd/data-request', colabS.token, {
    request_type: 'access',
    description: `[CERT ${RUN_ID}] Solicitação de acesso aos meus dados`
  });
  report.steps.push({ step: 'create_request', status: create.status, id: create.body?.request?.id });

  const reqId = create.body?.request?.id;
  let patch = { status: 0 };
  if (reqId) {
    patch = await httpJson('PATCH', `/api/lgpd/data-requests/${reqId}`, dpoS.token, {
      status: 'completed',
      response: 'Dados exportados conforme LGPD — cert E2E'
    });
    report.steps.push({ step: 'patch_request', status: patch.status });
  }

  const list = await httpJson('GET', '/api/lgpd/data-requests', colabS.token);
  report.steps.push({ step: 'list_requests', status: list.status });

  let dbRow = null;
  if (reqId) {
    const r = await db.query(
      'SELECT id, company_id, user_id, request_type, status FROM lgpd_data_requests WHERE id = $1',
      [reqId]
    );
    dbRow = r.rows[0];
  }

  const other = await pickOtherTenant(colab.company_id);
  let isolation = { tested: false, ok: true };
  if (other && reqId) {
    const otherS = await createSession(other.id, UA);
    const leak = await httpJson('GET', '/api/lgpd/data-requests', otherS.token);
    const ids = (leak.body?.requests || []).map((x) => String(x.id));
    isolation = { tested: true, ok: !ids.includes(String(reqId)), other_status: leak.status };
  }

  report.ok =
    create.status === 201 &&
    patch.status === 200 &&
    dbRow?.status === 'completed' &&
    dbRow?.company_id === colab.company_id &&
    isolation.ok;
  report.isolation = isolation;
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/dsr/data-subject-request/';

  writeEvidence(dir, 'request.json', { request_type: 'access' });
  writeEvidence(dir, 'response_create.json', create);
  writeEvidence(dir, 'response_patch.json', patch);
  writeEvidence(dir, 'db_row_request.json', dbRow);
  writeEvidence(dir, 'tenant_isolation.json', isolation);
  writeEvidence(dir, 'report.json', report);
  return report;
}

async function runBilling() {
  const dir = evidenceDir('billing', 'asaas-webhook');
  const report = { domain: 'Billing', run_id: RUN_ID, steps: [], ok: false };

  const admin = await pickUser(['admin', 'diretor']);
  if (!admin) {
    report.error = 'Sem admin';
    writeEvidence(dir, 'report.json', report);
    return report;
  }

  const companyId = admin.company_id;
  const subRef = `sub_cert_${RUN_ID.slice(-10)}`;
  const custRef = `cust_cert_${RUN_ID.slice(-10)}`;

  await db.query(
    `
    INSERT INTO subscriptions (company_id, asaas_customer_id, asaas_subscription_id, plan_type, status, next_due_date, grace_period_days)
    VALUES ($1, $2, $3, 'profissional', 'pending', CURRENT_DATE, 10)
    ON CONFLICT (company_id) DO UPDATE SET
      asaas_customer_id = EXCLUDED.asaas_customer_id,
      asaas_subscription_id = EXCLUDED.asaas_subscription_id,
      status = 'pending',
      updated_at = now()
    `,
    [companyId, custRef, subRef]
  );

  const webhookBody = {
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: `pay_${RUN_ID.slice(-10)}`,
      customer: custRef,
      subscription: subRef,
      status: 'CONFIRMED',
      dueDate: new Date().toISOString().slice(0, 10)
    }
  };

  const webhook = await httpJson('POST', '/api/webhooks/asaas', null, webhookBody);
  report.steps.push({ step: 'webhook', status: webhook.status });
  await sleep(800);

  const company = await db.query('SELECT id, subscription_status, active FROM companies WHERE id = $1', [companyId]);
  const log = await db.query(
    'SELECT id, event_type, processed FROM asaas_webhook_logs WHERE event_type = $1 ORDER BY created_at DESC LIMIT 1',
    ['PAYMENT_CONFIRMED']
  );

  report.ok = webhook.status === 200 && company.rows[0]?.subscription_status === 'active';
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/billing/asaas-webhook/';

  writeEvidence(dir, 'request.json', webhookBody);
  writeEvidence(dir, 'response_webhook.json', webhook);
  writeEvidence(dir, 'db_row_company.json', company.rows[0]);
  writeEvidence(dir, 'db_row_webhook_log.json', log.rows[0] || null);
  writeEvidence(dir, 'report.json', report);
  return report;
}

async function runEventGovernance(actorSession, adminSession, correlationId) {
  const dir = evidenceDir('governance', 'event-policy-decision');
  const report = { domain: 'Event Governance', run_id: RUN_ID, steps: [], ok: false };

  const evt = await httpJson('POST', '/api/safety-operational/events', actorSession.token, {
    kind: 'incident',
    title: `[CERT-EG ${RUN_ID}] Evento governado`,
    message: 'Teste política SST_LIFECYCLE',
    severity: 'alta',
    correlation_id: correlationId
  });
  report.steps.push({ step: 'sst_producer', status: evt.status });

  await sleep(300);

  const status = await httpJson('GET', '/api/audit/event-governance/status', adminSession.token);
  const sst = await httpJson('GET', '/api/audit/event-governance/sst', adminSession.token);
  const exec = await httpJson('GET', '/api/audit/event-governance/execution', adminSession.token);

  report.steps.push({ step: 'audit_status', status: status.status });
  report.steps.push({ step: 'audit_sst', status: sst.status, evaluated: sst.body?.events_evaluated });
  report.steps.push({ step: 'audit_execution', status: exec.status });

  report.ok =
    evt.status === 200 &&
    status.status === 200 &&
    sst.status === 200 &&
    (sst.body?.events_evaluated > 0 || sst.body?.policy_matches > 0);
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/governance/event-policy-decision/';

  writeEvidence(dir, 'response_producer.json', evt);
  writeEvidence(dir, 'response_audit_status.json', status);
  writeEvidence(dir, 'response_audit_sst.json', sst);
  writeEvidence(dir, 'response_audit_execution.json', exec);
  writeEvidence(dir, 'report.json', report);
  return report;
}

async function runAioi(actorSession, adminSession, correlationId) {
  const dir = evidenceDir('aioi', 'correlation-insight');
  const report = { domain: 'AIOI', run_id: RUN_ID, steps: [], ok: false };

  for (let i = 0; i < 3; i++) {
    const res = await httpJson('POST', '/api/safety-operational/events', actorSession.token, {
      kind: 'near_miss',
      title: `[CERT-AIOI ${RUN_ID}] Quase-acidente ${i + 1}`,
      message: 'Correlação repetida cert',
      severity: 'media',
      correlation_id: correlationId
    });
    report.steps.push({ step: `near_miss_${i + 1}`, status: res.status });
  }

  await sleep(400);

  const aioi = await httpJson('GET', '/api/audit/event-governance/aioi', adminSession.token);
  report.steps.push({
    step: 'audit_aioi',
    status: aioi.status,
    correlations: aioi.body?.correlations_detected,
    insights: aioi.body?.insights_generated
  });

  report.ok =
    aioi.status === 200 &&
    (aioi.body?.events_observed > 0 ||
      aioi.body?.correlations_detected > 0 ||
      aioi.body?.insights_generated > 0 ||
      aioi.body?.mode === 'shadow');
  report.finished_at = new Date().toISOString();
  report.evidence = 'backend/docs/evidence/aioi/correlation-insight/';

  writeEvidence(dir, 'response_audit_aioi.json', aioi);
  writeEvidence(dir, 'report.json', report);
  return report;
}

async function main() {
  const summary = { run_id: RUN_ID, started_at: new Date().toISOString(), domains: [] };

  try {
    const actor = await pickUser(['supervisor', 'gerente']);
    const admin = await pickUser(['admin'], actor?.company_id);
    const actorS = actor ? await createSession(actor.id, UA) : null;
    const adminS = admin ? await createSession(admin.id, UA) : null;
    const correlationId = uuidv4();

    const runners = [
      ['Executive', runExecutive],
      ['ManuIA', runManuia],
      ['ESG', runEsg],
      ['TPM', runTpm],
      ['DSR/LGPD', runDsr],
      ['Billing', runBilling]
    ];

    for (const [name, fn] of runners) {
      try {
        const r = await fn();
        summary.domains.push({ domain: name, ok: r.ok, error: r.error || null });
        console.log(JSON.stringify({ domain: name, ok: r.ok }, null, 0));
      } catch (e) {
        summary.domains.push({ domain: name, ok: false, error: e.message });
        console.error(`[${name}]`, e.message);
      }
    }

    if (actorS && adminS) {
      for (const [name, fn] of [
        ['Event Governance', () => runEventGovernance(actorS, adminS, correlationId)],
        ['AIOI', () => runAioi(actorS, adminS, correlationId)]
      ]) {
        try {
          const r = await fn();
          summary.domains.push({ domain: name, ok: r.ok, error: r.error || null });
          console.log(JSON.stringify({ domain: name, ok: r.ok }, null, 0));
        } catch (e) {
          summary.domains.push({ domain: name, ok: false, error: e.message });
        }
      }
    }

    summary.finished_at = new Date().toISOString();
    summary.ok = summary.domains.every((d) => d.ok);
    summary.passed = summary.domains.filter((d) => d.ok).length;
    summary.total = summary.domains.length;

    writeEvidence(evidenceDir('_batch', 'part72'), 'summary.json', summary);
    console.log(JSON.stringify(summary, null, 2));
    await cleanupSessions(UA);
    process.exit(summary.ok ? 0 : 1);
  } catch (e) {
    console.error(e);
    await cleanupSessions(UA);
    process.exit(1);
  }
}

main();
