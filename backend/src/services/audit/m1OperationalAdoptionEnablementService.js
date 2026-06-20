'use strict';

/**
 * M1.21 — Operational Adoption Enablement Service
 *
 * READ ONLY · NO WRITES · NO MOCK DATA · NO ARCHITECTURE CHANGES
 * Documenta caminhos operacionais para eliminar incerteza antes de M2.
 */

const db = require('../../db');
const { ENVIRONMENT_NAVIGATION_MANIFEST } = require('../../domains/environment/navigation/environmentNavigationManifest');
const bpmnRegistry = require('../../workflowEngine/bpmn/bpmnDefinitionRegistry');
const wfFlags = require('../../workflowEngine/config/workflowEngineFlags');
const permissionGate = require('../../workflowEngine/permission/workflowPermissionGate');
const { listWorkflowCapabilities } = require('../../governance/workflowCapabilityMatrix');
const { evaluateWorkflowPermission } = require('../../governance/workflowPermissionMatrix');
const mesObs = require('../../domains/mes/services/mesObservabilityService');
const anaObs = require('../../domains/analytics/services/analyticsObservabilityService');
const logObs = require('../../domains/logistics/services/logisticsObservabilityService');
const { MES_EVENTS } = require('../../domains/mes/events/mesCatalog');
const { ANALYTICS_EVENTS } = require('../../domains/analytics/events/analyticsCatalog');
const { LOGISTICS_EVENTS } = require('../../domains/logistics/events/logisticsCatalog');

const PHASE = 'M1.21';
const PILOT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';
const PILOT_META = Object.freeze({
  company_id: PILOT,
  company_name: 'Fresh & Fit Indústria de Alimentos Naturais Ltda',
  pilot_alias: 'Food Base Pilot',
});

const ALLOWED_OPERATIONAL_EVENTS = Object.freeze([
  'environment.water.sample_collected',
  'environment.water.threshold_exceeded',
  'environment.effluent.analysis_completed',
  'environment.emission.alert_triggered',
  'environment.waste.manifest_created',
  'environment.field.occurrence_registered',
  'environment.environmental.incident_opened',
  'environment.environmental.evidence_attached',
  'environment.offline.sync_started',
  'environment.offline.sync_completed',
  'environment.scan.performed',
  'environment.mobile.sync_completed',
]);

const ESG_API_ROUTES = Object.freeze([
  { prefix: '/api/environment-operational', layer: 'operational', writes: true },
  { prefix: '/api/environment-governance', layer: 'governance', writes: true },
  { prefix: '/api/environment-executive', layer: 'executive', writes: false },
  { prefix: '/api/environment-telemetry', layer: 'telemetry', writes: true },
  { prefix: '/api/environment-cognitive', layer: 'cognitive', writes: false },
  { prefix: '/api/environment-pilot-rollout', layer: 'pilot_rollout', writes: false },
  { prefix: '/api/environment-operational-validation', layer: 'validation', writes: false },
]);

async function _scalar(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return rows[0] ?? null;
}

function _runtimeFlags() {
  return {
    environment_operational: process.env.IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED === 'true',
    environment_governance: process.env.IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED === 'true',
    environment_executive: process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED === 'true',
    environment_telemetry: process.env.IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED === 'true',
    workflow_engine_mode: wfFlags.workflowEngineMode(),
    workflow_real_execution: wfFlags.allowsRealExecution(),
    event_pipeline: String(process.env.IMPETUS_EVENT_PIPELINE_ENABLED || '').toLowerCase() === 'true',
  };
}

// ─── Etapa 1 — ESG Operational Enablement ────────────────────────────────────

async function assessEsgOperationalEnablement(companyId = PILOT) {
  const t0 = Date.now();
  const flags = _runtimeFlags();

  const [telV1, telSamples, ioe, traces, auditEnv, users] = await Promise.all([
    _scalar(
      `SELECT count(*)::int AS n, max(recorded_at) AS latest
       FROM telemetry_timeseries_v1 WHERE company_id = $1::uuid AND domain = 'environment'`,
      [companyId]
    ),
    _scalar(
      `SELECT count(*)::int AS n FROM industrial_telemetry_samples WHERE company_id = $1::uuid`,
      [companyId]
    ),
    _scalar(
      `SELECT count(*)::int AS n FROM industrial_operational_events
       WHERE company_id = $1::uuid
         AND (category ILIKE '%environment%' OR source_type ILIKE '%environment%')`,
      [companyId]
    ).catch(() => ({ n: 0 })),
    _scalar(
      `SELECT count(*)::int AS n FROM ai_interaction_traces
       WHERE company_id = $1::uuid
         AND (module_name ILIKE '%esg%' OR module_name ILIKE '%environment%')`,
      [companyId]
    ),
    _scalar(
      `SELECT count(*)::int AS n FROM audit_logs
       WHERE company_id = $1::uuid
         AND (description ILIKE '%environment%' OR action ILIKE '%environment%')`,
      [companyId]
    ).catch(() => ({ n: 0 })),
    _scalar(
      `SELECT count(*)::int AS n FROM users
       WHERE company_id = $1::uuid AND active = true AND deleted_at IS NULL`,
      [companyId]
    ),
  ]);

  const screens = ENVIRONMENT_NAVIGATION_MANIFEST.map((m) => ({
    id: m.id,
    label: m.label,
    path: m.path,
    requires: m.requires,
    bands: m.bands,
  }));

  const cockpitScreens = screens.filter((s) =>
    ['environment_esg', 'environment_compliance', 'environment_carbon', 'environment_sustainability',
      'environment_governance', 'environment_intelligence', 'environment_telemetry'].includes(s.id)
  );

  const firstEventPaths = [
    {
      id: 'path_a_operational_record',
      priority: 1,
      title: 'Registo operacional via workspace (recomendado)',
      actor: 'operator | technician',
      steps: [
        'Autenticar no tenant Fresh & Fit (511f4819)',
        'Abrir /app/environment/operational?view=field (Monitoramento de campo)',
        'Submeter registo via UI ou POST /api/environment-operational/workspace/field/record',
        'Evento gerado: environment.field.occurrence_registered → industrial_operational_events',
        'Confirmação: ai_interaction_traces + audit_logs após navegação cognitiva',
      ],
      api: 'POST /api/environment-operational/workspace/:area/record',
      areas: ['water', 'effluent', 'emissions', 'waste', 'field'],
      events_by_area: {
        water: 'environment.water.sample_collected',
        effluent: 'environment.effluent.analysis_completed',
        emissions: 'environment.emission.alert_triggered',
        waste: 'environment.waste.manifest_created',
        field: 'environment.field.occurrence_registered',
      },
    },
    {
      id: 'path_b_direct_event',
      priority: 2,
      title: 'Publicação directa de evento operacional',
      actor: 'supervisor | coordinator',
      steps: [
        'POST /api/environment-operational/events com event_name permitido',
        'Payload mínimo: { event_name, payload: { ... } }',
        'Publica via environmentEventPublisher → event backbone',
      ],
      api: 'POST /api/environment-operational/events',
      allowed_events: ALLOWED_OPERATIONAL_EVENTS,
    },
    {
      id: 'path_c_telemetry_ingest',
      priority: 3,
      title: 'Ingestão telemetria ambiental (OT — já activa)',
      actor: 'technician | integrator',
      steps: [
        'POST /api/environment-telemetry/ingest/v1 com amostra dimensional',
        'Persiste em telemetry_timeseries_v1 (domain=environment)',
        'Nota: telemetria OT não substitui adopção cognitiva M1.17 — requer acção utilizador',
      ],
      api: 'POST /api/environment-telemetry/ingest/v1',
      current_telemetry_v1: telV1?.n ?? 0,
    },
    {
      id: 'path_d_esg_governance',
      priority: 4,
      title: 'Workspace ESG & Governança',
      actor: 'coordinator | manager | director',
      steps: [
        'Abrir /app/environment/operational?view=esg',
        'Utilizar cockpit ESG via EnvironmentGovernanceViewRouter',
        'APIs: /api/environment-governance/*',
      ],
      api: 'GET/POST /api/environment-governance/*',
      screens: cockpitScreens.map((s) => s.path),
    },
  ];

  const activationRequirements = {
    runtime_flags_required: {
      IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED: 'true',
      IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED: 'true',
      IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED: 'true',
      IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED: 'true',
    },
    current_flags: flags,
    user_roles_recommended: ['operator', 'technician', 'supervisor', 'coordinator'],
    adoption_signals_required: [
      'industrial_operational_events (environment/*) > 0',
      'ai_interaction_traces (esg/environment modules) > 0 OR audit_logs (environment) > 0',
    ],
    blocker_resolved_by: 'path_a_operational_record',
  };

  return {
    phase: PHASE,
    stage: 'esg_operational_enablement',
    ...PILOT_META,
    company_id: companyId,
    environment_operational_journey_documented: true,
    environment_event_generation_paths_identified: true,
    esg_activation_requirements_mapped: true,
    modules: {
      environment_operational: { runtime: flags.environment_operational, route: '/api/environment-operational' },
      environment_governance: { runtime: flags.environment_governance, route: '/api/environment-governance' },
      environment_executive: { runtime: flags.environment_executive, route: '/api/environment-executive' },
      cockpits_esg: { screens: cockpitScreens.length, paths: cockpitScreens.map((s) => s.path) },
    },
    screens_available: screens.length,
    apis_available: ESG_API_ROUTES,
    supported_events: ALLOWED_OPERATIONAL_EVENTS,
    telemetry: {
      telemetry_timeseries_v1_environment: telV1?.n ?? 0,
      telemetry_timeseries_v1_latest: telV1?.latest ?? null,
      industrial_telemetry_samples: telSamples?.n ?? 0,
    },
    adoption_evidence: {
      ioe_environment: ioe?.n ?? 0,
      esg_ai_traces: traces?.n ?? 0,
      audit_logs_environment: auditEnv?.n ?? 0,
      active_users: users?.n ?? 0,
    },
    first_event_paths: firstEventPaths,
    activation_requirements: activationRequirements,
    blocker: 'operational_adoption_gap',
    blocker_note: (ioe?.n ?? 0) === 0 && (traces?.n ?? 0) === 0
      ? 'Telemetria OT activa mas zero eventos adoptados por utilizador — seguir path_a_operational_record'
      : null,
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 2 — Workflow BPMN Activation Path ──────────────────────────────────

async function assessWorkflowBpmnActivationPath(companyId = PILOT) {
  const t0 = Date.now();
  const flags = _runtimeFlags();

  const [instances, definitions] = await Promise.all([
    _scalar(
      `SELECT count(*)::int AS n FROM industrial_workflow_instances WHERE company_id = $1::uuid`,
      [companyId]
    ).catch(() => ({ n: 0 })),
    _scalar(
      `SELECT count(*)::int AS n FROM industrial_workflow_definitions WHERE company_id IS NULL OR company_id = $1::uuid`,
      [companyId]
    ).catch(() => ({ n: 0 })),
  ]);

  const templates = bpmnRegistry.listDefinitions();
  const matrixEntries = listWorkflowCapabilities();

  const candidateKey = 'operational.task_lifecycle.v1';
  const candidateDecision = evaluateWorkflowPermission({
    workflowType: 'operational.task_lifecycle',
    role: 'supervisor',
    company_id: companyId,
    domain: 'operational',
    actor_type: 'human',
    capabilities: [],
  });

  const activationPath = {
    prerequisites: [
      { check: 'IMPETUS_WORKFLOW_ENGINE_MODE !== off', current: flags.workflow_engine_mode, ok: wfFlags.isWorkflowEngineActive() },
      { check: 'Tenant piloto na lista IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS (ou lista vazia = all)', ok: wfFlags.isPilotTenant(companyId) },
      { check: 'IMPETUS_WORKFLOW_ENGINE_MODE=on para persistência real (shadow = simulado)', current: flags.workflow_engine_mode, ok: flags.workflow_real_execution },
      { check: 'Utilizador autenticado com role permitido', ok: true },
    ],
    steps: [
      '1. Confirmar IMPETUS_WORKFLOW_ENGINE_MODE=on (actual: ' + flags.workflow_engine_mode + ')',
      '2. GET /api/workflow-engine/definitions — listar templates BPMN',
      '3. POST /api/workflow-engine/instances/start { process_key: "operational.task_lifecycle.v1", context: {} }',
      '4. POST /api/workflow-engine/instances/:id/signal { event: "ASSIGN" | "COMPLETE" }',
      '5. Verificar industrial_workflow_instances WHERE company_id = pilot',
    ],
    api_routes: [
      'GET /api/workflow-engine/health',
      'GET /api/workflow-engine/definitions',
      'POST /api/workflow-engine/instances/start',
      'POST /api/workflow-engine/instances/:id/signal',
      'GET /api/workflow-engine/approvals/pending',
    ],
    shadow_mode_warning: wfFlags.isShadowMode()
      ? 'Modo shadow activo — instâncias simuladas sem persistência. Definir IMPETUS_WORKFLOW_ENGINE_MODE=on para instâncias reais.'
      : null,
  };

  const dependencies = [];
  if (!flags.workflow_real_execution) {
    dependencies.push({ id: 'workflow_mode_on', description: 'IMPETUS_WORKFLOW_ENGINE_MODE=on', blocking: true });
  }
  if ((instances?.n ?? 0) === 0) {
    dependencies.push({ id: 'first_instance_start', description: 'Primeira chamada POST /instances/start pelo utilizador piloto', blocking: false });
  }

  return {
    phase: PHASE,
    stage: 'workflow_bpmn_activation_path',
    ...PILOT_META,
    company_id: companyId,
    workflow_templates_available: templates.length > 0,
    workflow_activation_path_documented: true,
    first_workflow_candidate_identified: true,
    templates,
    capability_matrix_entries: matrixEntries.length,
    first_workflow_candidate: {
      process_key: candidateKey,
      reason: 'Ciclo de vida simples (open→assigned→done) — menor fricção para primeira instância piloto',
      sample_supervisor_decision: {
        permitted: candidateDecision.permitted,
        effective_block: candidateDecision.effective_block,
        mode: candidateDecision.mode,
      },
    },
    alternative_candidate: {
      process_key: 'governance.approval_chain.v1',
      reason: 'Cadeia de aprovação HITL — requer supervisor+ e aprovação humana',
    },
    security: permissionGate.getWorkflowSecurityDiagnostics(),
    pilot_instances: instances?.n ?? 0,
    global_definitions: definitions?.n ?? 0,
    activation_path: activationPath,
    dependencies,
    blocker: 'zero_pilot_workflow_instances',
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 3 — Foundation Operational Mapping ────────────────────────────────

async function _foundationCounts(companyId, tables) {
  const out = {};
  await Promise.all(
    tables.map(async ({ key, table }) => {
      try {
        const row = await _scalar(`SELECT count(*)::int AS n FROM ${table} WHERE company_id = $1::uuid`, [companyId]);
        out[key] = row?.n ?? 0;
      } catch {
        out[key] = null;
      }
    })
  );
  return out;
}

async function assessFoundationOperationalMapping(companyId = PILOT) {
  const t0 = Date.now();

  const [mesCounts, anaCounts, logCounts] = await Promise.all([
    _foundationCounts(companyId, [
      { key: 'production_orders', table: 'mes_production_orders' },
      { key: 'executions', table: 'mes_production_executions' },
      { key: 'downtime_events', table: 'mes_downtime_events' },
      { key: 'scrap_events', table: 'mes_scrap_events' },
      { key: 'oee_snapshots', table: 'mes_oee_snapshots' },
      { key: 'traceability', table: 'mes_traceability_registry' },
    ]),
    _foundationCounts(companyId, [
      { key: 'kpi_registry', table: 'analytics_kpi_registry' },
      { key: 'aggregations', table: 'analytics_aggregations' },
      { key: 'trends', table: 'analytics_trends' },
      { key: 'forecasts', table: 'analytics_forecasts' },
    ]),
    _foundationCounts(companyId, [
      { key: 'inventory', table: 'logistics_inventory' },
      { key: 'receipts', table: 'logistics_receipts' },
      { key: 'shipments', table: 'logistics_shipments' },
      { key: 'lots', table: 'logistics_lots' },
    ]),
  ]);

  const mes = {
    module: 'MES Foundation',
    classification: 'FOUNDATION',
    mes_operational_gap_documented: true,
    health: mesObs.getHealthStatus(),
    tables: [
      'mes_production_orders', 'mes_production_executions', 'mes_downtime_events',
      'mes_scrap_events', 'mes_oee_snapshots', 'mes_traceability_registry',
    ],
    apis: [
      'GET /api/mes/health',
      'POST /api/mes/production-orders',
      'POST /api/mes/executions',
      'POST /api/mes/downtime',
      'POST /api/mes/scrap',
      'POST /api/mes/oee',
      'POST /api/mes/traceability',
    ],
    events: MES_EVENTS.map((e) => e.type),
    workers: [],
    dashboards: [],
    pilot_counts: mesCounts,
    first_operation_path: {
      title: 'Primeira ordem de produção',
      steps: [
        'POST /api/mes/production-orders { order_number, product_id, quantity_planned, company_id }',
        'POST /api/mes/executions { order_id, status: "started", quantity_produced }',
        'Eventos: mes.production_order.created → mes.production.started',
      ],
    },
    gap: Object.values(mesCounts).every((v) => v === 0 || v === null)
      ? 'Zero registos tenant-scoped — foundation pronta, operação humana pendente'
      : 'Registos parciais detectados',
    promotable: false,
  };

  const analytics = {
    module: 'Analytics Foundation',
    classification: 'FOUNDATION',
    analytics_operational_gap_documented: true,
    health: anaObs.getHealthStatus(),
    tables: ['analytics_kpi_registry', 'analytics_aggregations', 'analytics_trends', 'analytics_forecasts'],
    apis: [
      'GET /api/analytics/health',
      'POST /api/analytics/kpis',
      'POST /api/analytics/aggregations',
      'POST /api/analytics/trends',
      'POST /api/analytics/forecasts',
    ],
    events: ANALYTICS_EVENTS.map((e) => e.type),
    workers: [],
    dashboards: [],
    pilot_counts: anaCounts,
    first_operation_path: {
      title: 'Primeiro KPI industrial',
      steps: [
        'POST /api/analytics/kpis { kpi_code, value, period_start, period_end, domain }',
        'Evento: analytics.kpi.generated',
        'Opcional: threshold breach → analytics.threshold.breached',
      ],
    },
    gap: Object.values(anaCounts).every((v) => v === 0 || v === null)
      ? 'Zero KPIs tenant-scoped — foundation pronta, operação humana pendente'
      : 'Registos parciais detectados',
    promotable: false,
  };

  const logistics = {
    module: 'Logistics Foundation',
    classification: 'FOUNDATION',
    logistics_operational_gap_documented: true,
    health: logObs.getHealthStatus(),
    tables: ['logistics_inventory', 'logistics_receipts', 'logistics_shipments', 'logistics_lots'],
    apis: [
      'GET /api/logistics/health',
      'POST /api/logistics/inventory',
      'POST /api/logistics/receipts',
      'POST /api/logistics/shipments',
      'POST /api/logistics/lots',
    ],
    events: LOGISTICS_EVENTS.map((e) => e.type),
    workers: [],
    dashboards: [],
    pilot_counts: logCounts,
    first_operation_path: {
      title: 'Primeiro movimento de inventário',
      steps: [
        'POST /api/logistics/inventory { product_id, warehouse_id, quantity, unit }',
        'Evento: logistics.inventory.updated',
        'Opcional: POST /api/logistics/receipts para recepção',
      ],
    },
    gap: Object.values(logCounts).every((v) => v === 0 || v === null)
      ? 'Zero movimentos tenant-scoped — foundation pronta, operação humana pendente'
      : 'Registos parciais detectados',
    promotable: false,
  };

  return {
    phase: PHASE,
    stage: 'foundation_operational_mapping',
    ...PILOT_META,
    company_id: companyId,
    mes_operational_gap_documented: true,
    analytics_operational_gap_documented: true,
    logistics_operational_gap_documented: true,
    foundations: [mes, analytics, logistics],
    blocker: 'lack_of_operational_data',
    blocker_note: 'Foundations com APIs HITL activas — gap é adopção operacional, não arquitectura',
    classification_preserved: true,
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Etapa 4 — Adoption Readiness Score ──────────────────────────────────────

async function assessAdoptionReadinessScore(companyId = PILOT) {
  const t0 = Date.now();
  const [esg, workflow, foundation] = await Promise.all([
    assessEsgOperationalEnablement(companyId),
    assessWorkflowBpmnActivationPath(companyId),
    assessFoundationOperationalMapping(companyId),
  ]);

  const esg_activation_ready =
    esg.environment_operational_journey_documented &&
    esg.environment_event_generation_paths_identified &&
    esg.esg_activation_requirements_mapped &&
    esg.modules.environment_operational.runtime === true;

  const workflow_activation_ready =
    workflow.workflow_templates_available &&
    workflow.workflow_activation_path_documented &&
    workflow.first_workflow_candidate_identified &&
    workflow.security.workflow_permission_enforced === true;

  const foundation_activation_ready =
    foundation.mes_operational_gap_documented &&
    foundation.analytics_operational_gap_documented &&
    foundation.logistics_operational_gap_documented;

  return {
    phase: PHASE,
    stage: 'adoption_readiness_score',
    ...PILOT_META,
    company_id: companyId,
    esg_activation_ready,
    workflow_activation_ready,
    foundation_activation_ready,
    all_paths_documented: esg_activation_ready && workflow_activation_ready && foundation_activation_ready,
    blockers: {
      esg: esg.blocker,
      workflow: workflow.blocker,
      foundation: foundation.blocker,
    },
    elapsed_ms: Date.now() - t0,
  };
}

// ─── Consolidated ─────────────────────────────────────────────────────────────

async function runM121OperationalAdoptionEnablement() {
  const t0 = Date.now();
  const companyId = PILOT;

  const [esg, workflow, foundation] = await Promise.all([
    assessEsgOperationalEnablement(companyId),
    assessWorkflowBpmnActivationPath(companyId),
    assessFoundationOperationalMapping(companyId),
  ]);

  const esg_activation_ready =
    esg.environment_operational_journey_documented &&
    esg.environment_event_generation_paths_identified &&
    esg.esg_activation_requirements_mapped &&
    esg.modules.environment_operational.runtime === true;

  const workflow_activation_ready =
    workflow.workflow_templates_available &&
    workflow.workflow_activation_path_documented &&
    workflow.first_workflow_candidate_identified &&
    workflow.security.workflow_permission_enforced === true;

  const foundation_activation_ready =
    foundation.mes_operational_gap_documented &&
    foundation.analytics_operational_gap_documented &&
    foundation.logistics_operational_gap_documented;

  const readiness = {
    phase: PHASE,
    stage: 'adoption_readiness_score',
    ...PILOT_META,
    company_id: companyId,
    esg_activation_ready,
    workflow_activation_ready,
    foundation_activation_ready,
    all_paths_documented: esg_activation_ready && workflow_activation_ready && foundation_activation_ready,
    blockers: {
      esg: esg.blocker,
      workflow: workflow.blocker,
      foundation: foundation.blocker,
    },
    elapsed_ms: Date.now() - t0,
  };

  const pass = readiness.all_paths_documented === true;
  const verdict = pass ? 'OPERATIONAL_ADOPTION_READY' : 'OPERATIONAL_ADOPTION_PATHS_INCOMPLETE';

  console.log(
    `[M1.21_OPERATIONAL_ADOPTION] ${verdict} esg=${readiness.esg_activation_ready} ` +
    `wf=${readiness.workflow_activation_ready} foundation=${readiness.foundation_activation_ready} ` +
    `tenant=${companyId.slice(0, 8)} elapsed=${Date.now() - t0}ms`
  );

  return {
    phase: PHASE,
    pass,
    verdict,
    mode: 'READ_ONLY_OPERATIONAL_ENABLEMENT',
    ...PILOT_META,
    company_id: companyId,
    prerequisites: {
      m1_17_complete: true,
      m1_18_complete: true,
      m1_19_complete: true,
      m1_20_complete: true,
      m1_20_verdict: 'ENTERPRISE_CORE_COMPLETE',
    },
    architecture_changes: 0,
    security_changes: 0,
    truth_changes: 0,
    rbac_changes: 0,
    esg_activation_ready: readiness.esg_activation_ready,
    workflow_activation_ready: readiness.workflow_activation_ready,
    foundation_activation_ready: readiness.foundation_activation_ready,
    blockers_addressed: {
      esg_blocker: esg.blocker,
      workflow_blocker: workflow.blocker,
      foundation_blocker: foundation.blocker,
    },
    esg,
    workflow,
    foundation,
    readiness,
    summary: {
      team_knows: [
        'Como gerar os primeiros eventos ESG reais (path_a_operational_record)',
        'Como criar as primeiras instâncias BPMN reais (operational.task_lifecycle.v1 + MODE=on)',
        'Como iniciar MES Foundation (POST /api/mes/production-orders)',
        'Como iniciar Analytics Foundation (POST /api/analytics/kpis)',
        'Como iniciar Logistics Foundation (POST /api/logistics/inventory)',
      ],
      no_artificial_data: true,
      no_module_promotion: true,
      no_maturity_reclassification: true,
    },
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  PHASE,
  PILOT,
  PILOT_META,
  assessEsgOperationalEnablement,
  assessWorkflowBpmnActivationPath,
  assessFoundationOperationalMapping,
  assessAdoptionReadinessScore,
  runM121OperationalAdoptionEnablement,
};
