#!/usr/bin/env node
/**
 * Aplica resultados E2E (evidence report.json por domínio) à FUNCTIONAL_MATRIX.json
 * sem regenerar inventário estático (preserva classificações manuais Parte 7).
 *
 * Uso:
 *   node backend/scripts/audit/applyCertEvidenceToMatrix.js
 *   node backend/scripts/audit/applyCertEvidenceToMatrix.js --domain=quality|sst|all
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const MATRIX = path.join(REPO, 'backend/docs/FUNCTIONAL_MATRIX.json');
const MATRIX_MD = path.join(REPO, 'backend/docs/FUNCTIONAL_MATRIX.md');

const REPORTS = {
  quality: path.join(REPO, 'backend/docs/evidence/quality/nc-create/report.json'),
  sst: path.join(REPO, 'backend/docs/evidence/safety/lifecycle/report.json'),
  executive: path.join(REPO, 'backend/docs/evidence/executive/dashboard-profile/report.json'),
  manuia: path.join(REPO, 'backend/docs/evidence/manuia/diagnosis-workorder/report.json'),
  esg: path.join(REPO, 'backend/docs/evidence/esg/emission-waste-consumption/report.json'),
  tpm: path.join(REPO, 'backend/docs/evidence/tpm/preventive-lifecycle/report.json'),
  dsr: path.join(REPO, 'backend/docs/evidence/dsr/data-subject-request/report.json'),
  billing: path.join(REPO, 'backend/docs/evidence/billing/asaas-webhook/report.json'),
  governance: path.join(REPO, 'backend/docs/evidence/governance/event-policy-decision/report.json'),
  aioi: path.join(REPO, 'backend/docs/evidence/aioi/correlation-insight/report.json')
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function recomputeStats(matrix) {
  const dist = {};
  for (const r of matrix.rows || []) {
    dist[r.status] = (dist[r.status] || 0) + 1;
  }
  for (const s of matrix.certifiedScenarios || []) {
    dist[`SCENARIO_${s.status}`] = (dist[`SCENARIO_${s.status}`] || 0) + 1;
  }
  matrix.stats = matrix.stats || {};
  matrix.stats.statusDist = dist;
  matrix.stats.certifiedScenarioCount = (matrix.certifiedScenarios || []).length;
  matrix.stats.lastCertificationAt = new Date().toISOString();
}

function upsertScenario(matrix, scenario) {
  matrix.certifiedScenarios = matrix.certifiedScenarios || [];
  const idx = matrix.certifiedScenarios.findIndex(
    (s) => s.domain === scenario.domain && s.scenario === scenario.scenario
  );
  if (idx >= 0) matrix.certifiedScenarios[idx] = scenario;
  else matrix.certifiedScenarios.push(scenario);
}

function patchQualityScenario(matrix, report) {
  const evidence = report.classification?.evidence || 'backend/docs/evidence/quality/nc-create/';
  const validatedAt = (report.finished_at || new Date().toISOString()).slice(0, 10);

  upsertScenario(matrix, {
    domain: 'Quality',
    scenario: 'NC → CAPA → Auditoria',
    status: report.ok ? 'VERDE' : 'INCOMPLETO',
    evidence,
    lastValidatedAt: validatedAt,
    run_id: report.run_id,
    flows: [
      {
        feature: 'Registrar NC (inspeção não conforme)',
        endpoint: { method: 'POST', path: '/api/quality-intelligence/inspections' },
        backendService: 'services/qualityIntelligenceService.js',
        tables: ['quality_inspections'],
        status: 'VERDE',
        profiles: ['gerente', 'diretor', 'admin', 'ceo']
      },
      {
        feature: 'Instanciar workflow NCR universal',
        endpoint: { method: 'POST', path: '/api/internal/quality-universal/workflows/instance' },
        backendService: 'domains/quality/workflows/qualityDynamicWorkflowEngine.js',
        tables: ['impetus_quality_workflow_instance'],
        status: 'VERDE',
        profiles: ['admin', 'enterprise-internal']
      },
      {
        feature: 'Transição NCR submit → quality.ncr.opened',
        endpoint: { method: 'POST', path: '/api/internal/quality-universal/workflows/transition' },
        backendService: 'domains/quality/workflows/qualityDynamicWorkflowEngine.js',
        tables: ['impetus_quality_audit_chain'],
        status: 'VERDE',
        profiles: ['admin', 'enterprise-internal']
      },
      {
        feature: 'Instanciar CAPA vinculada à NC',
        endpoint: { method: 'POST', path: '/api/internal/quality-universal/workflows/instance' },
        backendService: 'domains/quality/workflows/qualityDynamicWorkflowEngine.js',
        tables: ['impetus_quality_workflow_instance'],
        status: 'VERDE',
        profiles: ['admin', 'enterprise-internal']
      },
      {
        feature: 'Transição CAPA submit → quality.capa.created',
        endpoint: { method: 'POST', path: '/api/internal/quality-universal/workflows/transition' },
        backendService: 'domains/quality/workflows/qualityDynamicWorkflowEngine.js',
        tables: ['impetus_quality_audit_chain'],
        status: 'VERDE',
        profiles: ['admin', 'enterprise-internal']
      }
    ],
    tenantIsolation: report.isolation || null,
    uiGap: {
      screen: 'QualityGovernanceHub / NcrCapaPanel',
      route: '/app/quality/operational?view=ncr',
      status: 'VERDE',
      notes: 'KPIs hidratados via GET /api/quality-intelligence/nc-capa-summary'
    }
  });

  const verdeNote =
    'Parte 7.2: backend NC→CAPA VERDE; NcrCapaPanel com KPIs via nc-capa-summary — ver certifiedScenarios';

  for (const row of matrix.rows || []) {
    if (row.module !== 'Quality') continue;
    if (row.screen === 'QualityOperationalWorkspacePage') {
      row.status = report.ok ? 'VERDE' : 'AMARELO';
      row.evidence = evidence;
      row.lastValidatedAt = validatedAt;
      row.feature = 'NC → CAPA (governance view)';
      row.notes = verdeNote;
    }
    if (row.screen === 'QualityInspectionRuntimePage') {
      row.status = report.ok ? 'VERDE' : 'AMARELO';
      row.evidence = evidence;
      row.lastValidatedAt = validatedAt;
      row.feature = 'Inspeção operacional';
      row.notes = 'POST inspections comprovado em certifiedScenarios';
    }
  }
}

function patchSstScenario(matrix, report) {
  const evidence = report.classification?.evidence || 'backend/docs/evidence/safety/lifecycle/';
  const validatedAt = (report.finished_at || new Date().toISOString()).slice(0, 10);

  upsertScenario(matrix, {
    domain: 'SST',
    scenario: 'Incidente / Quase-acidente / Treinamento vencido',
    status: report.ok ? 'VERDE' : 'INCOMPLETO',
    evidence,
    lastValidatedAt: validatedAt,
    run_id: report.run_id,
    flows: [
      {
        feature: 'Registrar incidente SST',
        endpoint: { method: 'POST', path: '/api/safety-operational/events' },
        backendService: 'services/operationalAlertsService.js',
        tables: ['operational_alerts'],
        status: 'VERDE',
        profiles: ['supervisor', 'gerente', 'diretor', 'admin']
      },
      {
        feature: 'Registrar quase-acidente',
        endpoint: { method: 'POST', path: '/api/safety-operational/events' },
        backendService: 'services/operationalAlertsService.js',
        tables: ['operational_alerts'],
        status: 'VERDE',
        profiles: ['supervisor', 'gerente', 'diretor', 'admin']
      },
      {
        feature: 'Treinamento vencido + alerta HR',
        endpoint: { method: 'POST', path: '/api/safety-operational/events' },
        backendService: 'services/operationalAlertsService.js',
        tables: ['operational_alerts', 'hr_alerts'],
        status: 'VERDE',
        profiles: ['supervisor', 'gerente', 'diretor', 'admin']
      },
      {
        feature: 'Listar alertas (Notification Center / Cérebro Operacional)',
        endpoint: { method: 'GET', path: '/api/dashboard/operational-brain/alerts' },
        backendService: 'services/operationalAlertsService.js',
        tables: ['operational_alerts'],
        status: 'VERDE',
        profiles: ['autenticado tenant']
      }
    ],
    tenantIsolation: report.isolation || null,
    uiGap: {
      screen: 'SafetyOperationalWorkspace (view=incident)',
      route: '/app/safety/operational?view=incident',
      status: 'VERDE',
      notes: 'SafetyIncidentPanel ligado a POST/GET /api/safety-operational/events'
    }
  });

  const verdeNote =
    'Parte 7.2: API SST lifecycle VERDE; SafetyIncidentPanel ligado — ver certifiedScenarios';

  for (const row of matrix.rows || []) {
    if (row.module !== 'SST') continue;
    if (row.screen === 'SafetyOperationalWorkspacePage') {
      row.status = report.ok ? 'VERDE' : 'AMARELO';
      row.evidence = evidence;
      row.lastValidatedAt = validatedAt;
      row.feature = 'Incidente / near-miss / treinamento vencido';
      row.notes = verdeNote;
    }
  }
}

function patchFromConfig(matrix, report, cfg) {
  const evidence = cfg.evidence || report.evidence;
  const validatedAt = (report.finished_at || new Date().toISOString()).slice(0, 10);
  upsertScenario(matrix, {
    domain: cfg.domain,
    scenario: cfg.scenario,
    status: report.ok ? 'VERDE' : 'INCOMPLETO',
    evidence,
    lastValidatedAt: validatedAt,
    run_id: report.run_id,
    flows: cfg.flows,
    tenantIsolation: report.isolation || null,
    uiGap: cfg.uiGap || null
  });
  if (cfg.patchRows) {
    for (const pr of cfg.patchRows) {
      for (const row of matrix.rows || []) {
        if (row.module === pr.module && (!pr.screen || row.screen === pr.screen)) {
          row.status = report.ok ? pr.statusOk || 'AMARELO' : 'INCOMPLETO';
          row.evidence = evidence;
          row.lastValidatedAt = validatedAt;
          row.feature = pr.feature || cfg.scenario;
          row.notes = pr.notes || cfg.scenario;
        }
      }
    }
  }
}

function patchExecutive(matrix, report) {
  patchFromConfig(matrix, report, {
    domain: 'Executive',
    scenario: 'Dashboard executivo por perfil',
    evidence: 'backend/docs/evidence/executive/dashboard-profile/',
    flows: [
      { feature: 'Perfil + KPIs executivos', endpoint: { method: 'GET', path: '/api/dashboard/me' }, status: 'VERDE' },
      { feature: 'KPIs tenant-scoped', endpoint: { method: 'GET', path: '/api/dashboard/kpis' }, status: 'VERDE' }
    ],
    patchRows: [{ module: 'Core', screen: 'Dashboard', statusOk: 'VERDE', feature: 'Dashboard executivo por perfil' }]
  });
}

function patchManuia(matrix, report) {
  const evidence = report.classification?.evidence || 'backend/docs/evidence/manuia/diagnosis-workorder/';
  const validatedAt = (report.finished_at || new Date().toISOString()).slice(0, 10);
  patchFromConfig(matrix, report, {
    domain: 'ManuIA',
    scenario: 'Diagnóstico → OS → Histórico',
    evidence,
    flows: [
      { feature: 'Concluir sessão + criar OS', endpoint: { method: 'POST', path: '/api/manutencao-ia/conclude-session' }, status: 'VERDE', tables: ['work_orders'] },
      { feature: 'Histórico sessões', endpoint: { method: 'GET', path: '/api/manutencao-ia/sessions' }, status: 'VERDE' }
    ],
    uiGap: {
      screen: 'ManuIA / ManuiaOperationalKpiStrip',
      route: '/app/manutencao/manuia',
      status: 'VERDE',
      notes: 'KPIs via getSessions, getMachines, getHealth no topo da página'
    },
    patchRows: [
      { module: 'ManuIA', screen: 'ManuIA', statusOk: 'VERDE', feature: 'Diagnóstico → OS → KPIs operacionais' },
      { module: 'ManuIA', screen: 'ManuIAExtensionApp', statusOk: 'AMARELO', feature: 'PWA extensão ManuIA' }
    ]
  });
}

function patchEsg(matrix, report) {
  const evidence = report.classification?.evidence || 'backend/docs/evidence/esg/emission-waste-consumption/';
  patchFromConfig(matrix, report, {
    domain: 'ESG',
    scenario: 'Emissão / Resíduo / Consumo',
    evidence,
    flows: [
      { feature: 'Alerta emissão', endpoint: { method: 'POST', path: '/api/environment-operational/events' }, status: 'VERDE' },
      { feature: 'Manifesto resíduo', endpoint: { method: 'POST', path: '/api/environment-operational/events' }, status: 'VERDE' },
      { feature: 'Amostra água/consumo', endpoint: { method: 'POST', path: '/api/environment-operational/events' }, status: 'VERDE' },
      { feature: 'KPIs eventos ambientais', endpoint: { method: 'GET', path: '/api/environment-operational/events/summary' }, status: 'VERDE' }
    ],
    uiGap: {
      screen: 'EnvironmentOperationalEventsPanel',
      route: '/app/environment/operational?view=events',
      status: 'VERDE',
      notes: 'POST/GET environment-operational/events + summary ligados ao painel industrial'
    },
    patchRows: [
      { module: 'ESG', screen: 'EnvironmentOperationalWorkspacePage', statusOk: 'VERDE', feature: 'Emissão / Resíduo / Consumo + painel eventos' },
      { module: 'ESG', screen: 'EnvironmentOperationalLayout', statusOk: 'AMARELO', feature: 'Layout operacional ambiental' }
    ]
  });
}

function patchTpm(matrix, report) {
  patchFromConfig(matrix, report, {
    domain: 'TPM',
    scenario: 'Plano preventivo → execução → indicador',
    evidence: 'backend/docs/evidence/tpm/preventive-lifecycle/',
    flows: [
      { feature: 'Criar preventiva', endpoint: { method: 'POST', path: '/api/dashboard/maintenance/preventives' }, status: 'VERDE', tables: ['maintenance_preventives'] },
      { feature: 'Concluir preventiva', endpoint: { method: 'PATCH', path: '/api/dashboard/maintenance/preventives/:id' }, status: 'VERDE' },
      { feature: 'Indicadores summary', endpoint: { method: 'GET', path: '/api/dashboard/maintenance/summary' }, status: 'VERDE' }
    ]
  });
}

function patchDsr(matrix, report) {
  patchFromConfig(matrix, report, {
    domain: 'DSR/LGPD',
    scenario: 'Pedido do titular',
    evidence: 'backend/docs/evidence/dsr/data-subject-request/',
    flows: [
      { feature: 'Criar pedido LGPD', endpoint: { method: 'POST', path: '/api/lgpd/data-request' }, status: 'VERDE', tables: ['lgpd_data_requests'] },
      { feature: 'Processar pedido (DPO)', endpoint: { method: 'PATCH', path: '/api/lgpd/data-requests/:id' }, status: 'VERDE' }
    ],
    patchRows: [{ module: 'Core', screen: 'RoleVerificationPage', statusOk: 'AMARELO' }]
  });
}

function patchBilling(matrix, report) {
  patchFromConfig(matrix, report, {
    domain: 'Billing',
    scenario: 'Webhook Asaas / subscrição',
    evidence: 'backend/docs/evidence/billing/asaas-webhook/',
    flows: [
      { feature: 'Webhook PAYMENT_CONFIRMED', endpoint: { method: 'POST', path: '/api/webhooks/asaas' }, status: 'VERDE', tables: ['subscriptions', 'asaas_webhook_logs'] }
    ]
  });
}

function patchGovernance(matrix, report) {
  patchFromConfig(matrix, report, {
    domain: 'Event Governance',
    scenario: 'Evento → política → decisão',
    evidence: 'backend/docs/evidence/governance/event-policy-decision/',
    flows: [
      { feature: 'Produtor SST', endpoint: { method: 'POST', path: '/api/safety-operational/events' }, status: 'VERDE' },
      { feature: 'Audit status EG', endpoint: { method: 'GET', path: '/api/audit/event-governance/status' }, status: 'VERDE' },
      { feature: 'Audit SST lifecycle', endpoint: { method: 'GET', path: '/api/audit/event-governance/sst' }, status: 'VERDE' }
    ]
  });
}

function patchAioi(matrix, report) {
  patchFromConfig(matrix, report, {
    domain: 'AIOI',
    scenario: 'Correlação → Insight → Escalonamento',
    evidence: 'backend/docs/evidence/aioi/correlation-insight/',
    flows: [
      { feature: 'Eventos correlacionados (×3)', endpoint: { method: 'POST', path: '/api/safety-operational/events' }, status: 'VERDE' },
      { feature: 'Audit AIOI', endpoint: { method: 'GET', path: '/api/audit/event-governance/aioi' }, status: 'VERDE' }
    ]
  });
}

const PATCHERS = {
  quality: patchQualityScenario,
  sst: patchSstScenario,
  executive: patchExecutive,
  manuia: patchManuia,
  esg: patchEsg,
  tpm: patchTpm,
  dsr: patchDsr,
  billing: patchBilling,
  governance: patchGovernance,
  aioi: patchAioi
};

function appendMdSection(matrix) {
  if (!fs.existsSync(MATRIX_MD)) return;
  let md = fs.readFileSync(MATRIX_MD, 'utf8');
  const marker = '## Cenários certificados (Parte 7.2 E2E)';
  const start = md.indexOf(marker);
  if (start >= 0) md = md.slice(0, start).trimEnd();

  const lines = [
    '',
    marker,
    '',
    '> Atualizado por `applyCertEvidenceToMatrix.js` — não sobrescrever com buildFunctionalMatrix.',
    ''
  ];

  for (const s of matrix.certifiedScenarios || []) {
    lines.push(`### ${s.domain}: ${s.scenario}`);
    lines.push('');
    lines.push('| Campo | Valor |');
    lines.push('|-------|-------|');
    lines.push(`| Status | **${s.status}** |`);
    lines.push(`| Evidência | \`${s.evidence}\` |`);
    lines.push(`| Validado em | ${s.lastValidatedAt} |`);
    lines.push(`| Run ID | ${s.run_id || '—'} |`);
    if (s.tenantIsolation?.tested) {
      lines.push(
        `| Isolamento tenant | ${s.tenantIsolation.ok ? 'OK' : 'FALHA'} (HTTP ${s.tenantIsolation.other_status ?? s.tenantIsolation.resolve_status ?? '—'}) |`
      );
    }
    if (s.uiGap) {
      lines.push(`| Gap UI | ${s.uiGap.screen} → **${s.uiGap.status}** |`);
    }
    lines.push('');
    lines.push('| Fluxo | Endpoint | Status |');
    lines.push('|-------|----------|--------|');
    for (const f of s.flows || []) {
      lines.push(`| ${f.feature} | \`${f.endpoint.method} ${f.endpoint.path}\` | ${f.status} |`);
    }
    lines.push('');
  }

  fs.writeFileSync(MATRIX_MD, md + lines.join('\n') + '\n', 'utf8');
}

function main() {
  const domainArg = process.argv.find((a) => a.startsWith('--domain='));
  const domain = domainArg ? domainArg.split('=')[1] : 'all';

  if (!fs.existsSync(MATRIX)) {
    console.error('Matriz não encontrada:', MATRIX);
    process.exit(1);
  }

  const matrix = readJson(MATRIX);
  const applied = [];

  for (const [key, patcher] of Object.entries(PATCHERS)) {
    if (domain !== 'all' && domain !== key) continue;
    if (!fs.existsSync(REPORTS[key])) continue;
    patcher(matrix, readJson(REPORTS[key]));
    applied.push(key);
  }

  if (!applied.length) {
    console.error('Nenhum report de evidência encontrado para domain=', domain);
    process.exit(1);
  }

  recomputeStats(matrix);
  writeJson(MATRIX, matrix);
  appendMdSection(matrix);

  console.log(
    JSON.stringify(
      {
        ok: true,
        applied,
        certifiedScenarios: matrix.certifiedScenarios?.length,
        statusDist: matrix.stats.statusDist
      },
      null,
      2
    )
  );
}

main();
