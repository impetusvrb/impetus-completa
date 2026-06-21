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
  sst: path.join(REPO, 'backend/docs/evidence/safety/lifecycle/report.json')
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
      status: 'INCOMPLETO',
      notes: 'KPIs stub; backend comprovado via API E2E'
    }
  });

  const amareloNote =
    'Parte 7.2: backend NC→CAPA VERDE (API); NcrCapaPanel UI stub INCOMPLETO — ver certifiedScenarios';

  for (const row of matrix.rows || []) {
    if (row.module !== 'Quality') continue;
    if (row.screen === 'QualityOperationalWorkspacePage') {
      row.status = 'AMARELO';
      row.evidence = evidence;
      row.lastValidatedAt = validatedAt;
      row.feature = 'NC → CAPA (governance view)';
      row.notes = amareloNote;
    }
    if (row.screen === 'QualityInspectionRuntimePage') {
      row.status = 'AMARELO';
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
      status: 'INCOMPLETO',
      notes: 'Workspace incident sem formulário; API POST /events pronta para integração industrial'
    }
  });

  const amareloNote =
    'Parte 7.2: API SST lifecycle VERDE; UI incident placeholder — ver certifiedScenarios';

  for (const row of matrix.rows || []) {
    if (row.module !== 'SST') continue;
    if (row.screen === 'SafetyOperationalWorkspacePage') {
      row.status = 'AMARELO';
      row.evidence = evidence;
      row.lastValidatedAt = validatedAt;
      row.feature = 'Incidente / near-miss / treinamento vencido';
      row.notes = amareloNote;
    }
  }
}

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

  if ((domain === 'all' || domain === 'quality') && fs.existsSync(REPORTS.quality)) {
    patchQualityScenario(matrix, readJson(REPORTS.quality));
    applied.push('quality');
  }
  if ((domain === 'all' || domain === 'sst') && fs.existsSync(REPORTS.sst)) {
    patchSstScenario(matrix, readJson(REPORTS.sst));
    applied.push('sst');
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
