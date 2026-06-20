'use strict';

/**
 * Adoption Progress Tracker — M1.22–M1.27 Gate Measurement Service
 *
 * READ ONLY · NO WRITES · NO MOCK DATA
 *
 * Mede em tempo real o progresso de cada domínio em relação
 * aos critérios mínimos dos gates operacionais M1.22–M1.27.
 * Único artefacto que pode ser construído em código enquanto a
 * operação real não foi iniciada pelos utilizadores piloto.
 */

'use strict';

const db = require('../../db');
const wfFlags = require('../../workflowEngine/config/workflowEngineFlags');

const PHASE = 'ADOPTION_TRACKER';
const PILOT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';
const PILOT_META = Object.freeze({
  company_id: PILOT,
  company_name: 'Fresh & Fit Indústria de Alimentos Naturais Ltda',
  pilot_alias: 'Food Base Pilot',
});

// ─── Gate criteria (determinísticas, sem mock) ───────────────────────────────

const GATE_CRITERIA = Object.freeze({
  M1_22: {
    phase: 'M1.22',
    name: 'ESG Operational Activation',
    criteria: { min_events: 50, min_users: 10, window_days: 30 },
  },
  M1_23: {
    phase: 'M1.23',
    name: 'Workflow Operational Activation',
    criteria: { min_instances_completed: 30, min_process_types: 2, window_days: 30 },
  },
  M1_24: {
    phase: 'M1.24',
    name: 'MES Operational Pilot',
    criteria: { min_orders: 100, min_executions: 50, window_days: 30 },
  },
  M1_25: {
    phase: 'M1.25',
    name: 'Operational Evidence Collection (P0A/P0B/P0C)',
    criteria: { continuous_days: 60, prerequisite_phases: ['M1.22', 'M1.23', 'M1.24'] },
  },
  M1_26: {
    phase: 'M1.26',
    name: 'Multi-Tenant Real Validation (P0D)',
    criteria: { min_companies: 2, simultaneous_telemetry: true },
  },
  M1_27: {
    phase: 'M1.27',
    name: 'Executive Real Operations Report (P0E)',
    criteria: { prerequisite_phases: ['M1.25'], all_domains_operational: true },
  },
});

// ─── helpers ─────────────────────────────────────────────────────────────────

async function _scalar(sql, params = []) {
  const { rows } = await db.query(sql, params);
  return rows[0] ?? null;
}

async function _safeCount(sql, params = []) {
  try {
    const row = await _scalar(sql, params);
    return row?.n ?? 0;
  } catch {
    return null;
  }
}

function _pct(current, target) {
  if (!target || target === 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.round((current / target) * 100));
}

// ─── M1.22 — ESG gate ────────────────────────────────────────────────────────

async function measureEsgGate(companyId = PILOT) {
  const c = GATE_CRITERIA.M1_22.criteria;

  const [ioe, traces, audit, auditRecent, users, telV1] = await Promise.all([
    _safeCount(
      `SELECT count(*)::int AS n FROM industrial_operational_events
       WHERE company_id=$1::uuid AND (category ILIKE '%environment%' OR source_type ILIKE '%environment%')`,
      [companyId]
    ),
    _safeCount(
      `SELECT count(*)::int AS n FROM ai_interaction_traces
       WHERE company_id=$1::uuid AND (module_name ILIKE '%esg%' OR module_name ILIKE '%environment%')`,
      [companyId]
    ),
    _safeCount(
      `SELECT count(*)::int AS n FROM audit_logs
       WHERE company_id=$1::uuid AND (description ILIKE '%environment%' OR action ILIKE '%environment%')`,
      [companyId]
    ),
    _safeCount(
      `SELECT count(*)::int AS n FROM audit_logs
       WHERE company_id=$1::uuid
         AND (description ILIKE '%environment%' OR action ILIKE '%environment%')
         AND created_at > NOW() - INTERVAL '30 days'`,
      [companyId]
    ),
    _safeCount(
      `SELECT count(DISTINCT t.user_id)::int AS n FROM ai_interaction_traces t
       WHERE t.company_id=$1::uuid
         AND (t.module_name ILIKE '%esg%' OR t.module_name ILIKE '%environment%')
         AND t.created_at > NOW() - INTERVAL '30 days'`,
      [companyId]
    ),
    _safeCount(
      `SELECT count(*)::int AS n FROM telemetry_timeseries_v1
       WHERE company_id=$1::uuid AND domain='environment'`,
      [companyId]
    ),
  ]);

  const totalSignals = (ioe ?? 0) + (traces ?? 0) + (audit ?? 0);
  const recentSignals = (auditRecent ?? 0) + (traces ?? 0);
  const usersCount = users ?? 0;

  const events_pct = _pct(recentSignals, c.min_events);
  const users_pct = _pct(usersCount, c.min_users);
  const overall_pct = Math.round((events_pct + users_pct) / 2);

  const gate_open = recentSignals >= c.min_events && usersCount >= c.min_users;

  return {
    phase: 'M1.22',
    name: GATE_CRITERIA.M1_22.name,
    gate_open,
    overall_progress_pct: overall_pct,
    criteria: c,
    evidence: {
      ioe_environment_total: ioe,
      esg_ai_traces_total: traces,
      audit_logs_total: audit,
      signals_last_30d: recentSignals,
      active_users_last_30d: usersCount,
      telemetry_v1_environment: telV1,
    },
    progress: { events_pct, users_pct },
    blocker: gate_open ? null : 'operational_adoption_gap_not_architectural',
    action_required: gate_open ? null : {
      primary: 'POST /api/environment-operational/workspace/field/record',
      description: 'Registar evento ambiental real no workspace (path_a_operational_record)',
      see: 'M1_21_OPERATIONAL_ADOPTION_ENABLEMENT.md § Etapa 1',
    },
  };
}

// ─── M1.23 — Workflow gate ───────────────────────────────────────────────────

async function measureWorkflowGate(companyId = PILOT) {
  const c = GATE_CRITERIA.M1_23.criteria;
  const mode = wfFlags.workflowEngineMode();
  const realMode = wfFlags.allowsRealExecution();

  const [total, completed, processTypes] = await Promise.all([
    _safeCount(
      `SELECT count(*)::int AS n FROM industrial_workflow_instances WHERE company_id=$1::uuid`,
      [companyId]
    ),
    _safeCount(
      `SELECT count(*)::int AS n FROM industrial_workflow_instances
       WHERE company_id=$1::uuid AND status='completed'`,
      [companyId]
    ),
    _safeCount(
      `SELECT count(DISTINCT process_key)::int AS n FROM industrial_workflow_instances
       WHERE company_id=$1::uuid AND status='completed'`,
      [companyId]
    ),
  ]);

  const completed_pct = _pct(completed ?? 0, c.min_instances_completed);
  const types_pct = _pct(processTypes ?? 0, c.min_process_types);
  const overall_pct = Math.round((completed_pct + types_pct) / 2);
  const gate_open = (completed ?? 0) >= c.min_instances_completed && (processTypes ?? 0) >= c.min_process_types;

  return {
    phase: 'M1.23',
    name: GATE_CRITERIA.M1_23.name,
    gate_open,
    overall_progress_pct: overall_pct,
    criteria: c,
    engine: { mode, real_execution: realMode },
    evidence: { total_instances: total, completed_instances: completed, distinct_process_types: processTypes },
    progress: { completed_pct, types_pct },
    blocker: gate_open ? null : realMode ? 'adoption_pending' : 'workflow_engine_mode_not_on',
    action_required: gate_open ? null : {
      primary: realMode
        ? 'POST /api/workflow-engine/instances/start { process_key: "operational.task_lifecycle.v1" }'
        : 'Definir IMPETUS_WORKFLOW_ENGINE_MODE=on no .env e reiniciar PM2',
      see: 'M1_21_OPERATIONAL_ADOPTION_ENABLEMENT.md § Etapa 2',
    },
  };
}

// ─── M1.24 — MES gate ───────────────────────────────────────────────────────

async function measureMesGate(companyId = PILOT) {
  const c = GATE_CRITERIA.M1_24.criteria;

  const [orders, executions, downtime, scrap] = await Promise.all([
    _safeCount(`SELECT count(*)::int AS n FROM mes_production_orders WHERE company_id=$1::uuid`, [companyId]),
    _safeCount(`SELECT count(*)::int AS n FROM mes_production_executions WHERE company_id=$1::uuid`, [companyId]),
    _safeCount(`SELECT count(*)::int AS n FROM mes_downtime_events WHERE company_id=$1::uuid`, [companyId]),
    _safeCount(`SELECT count(*)::int AS n FROM mes_scrap_events WHERE company_id=$1::uuid`, [companyId]),
  ]);

  const orders_pct = _pct(orders ?? 0, c.min_orders);
  const executions_pct = _pct(executions ?? 0, c.min_executions);
  const overall_pct = Math.round((orders_pct + executions_pct) / 2);
  const gate_open = (orders ?? 0) >= c.min_orders && (executions ?? 0) >= c.min_executions;

  return {
    phase: 'M1.24',
    name: GATE_CRITERIA.M1_24.name,
    gate_open,
    overall_progress_pct: overall_pct,
    criteria: c,
    evidence: { orders, executions, downtime_events: downtime, scrap_events: scrap },
    progress: { orders_pct, executions_pct },
    maturity_current: 'Foundation',
    maturity_target: 'Pilot Ready',
    blocker: gate_open ? null : 'lack_of_operational_data',
    action_required: gate_open ? null : {
      primary: 'POST /api/mes/production-orders { order_number, product_id, quantity_planned, company_id }',
      see: 'M1_21_OPERATIONAL_ADOPTION_ENABLEMENT.md § Etapa 3 — MES Foundation',
    },
  };
}

// ─── M1.25–M1.27 status (dependem de M1.22–M1.24) ──────────────────────────

function measureDependentGates(esg, wf, mes) {
  const m122_done = esg.gate_open;
  const m123_done = wf.gate_open;
  const m124_done = mes.gate_open;
  const prerequisites_met = m122_done && m123_done && m124_done;

  return {
    M1_25: {
      phase: 'M1.25',
      name: 'Operational Evidence Collection (P0A/P0B/P0C)',
      gate_open: false,
      can_start: prerequisites_met,
      prerequisites_met,
      missing_prerequisites: [
        !m122_done ? 'M1.22 ESG' : null,
        !m123_done ? 'M1.23 Workflow' : null,
        !m124_done ? 'M1.24 MES' : null,
      ].filter(Boolean),
      time_required: '60–90 days of continuous operation',
      gate_type: 'time_based_observation',
    },
    M1_26: {
      phase: 'M1.26',
      name: 'Multi-Tenant Real Validation (P0D)',
      gate_open: false,
      can_start: false,
      note: 'Architecture complete (M1.19) — awaiting 2nd production tenant',
      gate_type: 'business_decision',
    },
    M1_27: {
      phase: 'M1.27',
      name: 'Executive Real Operations Report (P0E)',
      gate_open: false,
      can_start: false,
      prerequisite: 'M1.25 completed',
      gate_type: 'evidence_based',
    },
  };
}

// ─── Analytics & Logistics (secondary gates) ────────────────────────────────

async function measureAnalyticsGate(companyId = PILOT) {
  const [kpis, agg, trends] = await Promise.all([
    _safeCount(`SELECT count(*)::int AS n FROM analytics_kpi_registry WHERE company_id=$1::uuid`, [companyId]),
    _safeCount(`SELECT count(*)::int AS n FROM analytics_aggregations WHERE company_id=$1::uuid`, [companyId]),
    _safeCount(`SELECT count(*)::int AS n FROM analytics_trends WHERE company_id=$1::uuid`, [companyId]),
  ]);
  const operational = (kpis ?? 0) > 0 && (agg ?? 0) > 0;
  return {
    phase: 'M2.5',
    name: 'Analytics Operational',
    operational,
    maturity_current: 'Foundation',
    evidence: { kpis, aggregations: agg, trends },
    action_required: operational ? null : 'POST /api/analytics/kpis → analytics.kpi.generated',
  };
}

async function measureLogisticsGate(companyId = PILOT) {
  const [inv, receipts, shipments] = await Promise.all([
    _safeCount(`SELECT count(*)::int AS n FROM logistics_inventory WHERE company_id=$1::uuid`, [companyId]),
    _safeCount(`SELECT count(*)::int AS n FROM logistics_receipts WHERE company_id=$1::uuid`, [companyId]),
    _safeCount(`SELECT count(*)::int AS n FROM logistics_shipments WHERE company_id=$1::uuid`, [companyId]),
  ]);
  const operational = (inv ?? 0) > 0;
  return {
    phase: 'M2.4',
    name: 'Logistics Operational',
    operational,
    maturity_current: 'Foundation',
    evidence: { inventory: inv, receipts, shipments },
    action_required: operational ? null : 'POST /api/logistics/inventory → logistics.inventory.updated',
  };
}

// ─── Consolidated ─────────────────────────────────────────────────────────────

async function runAdoptionProgressTracker(companyId = PILOT) {
  const t0 = Date.now();

  const [esg, wf, mes, analytics, logistics] = await Promise.all([
    measureEsgGate(companyId),
    measureWorkflowGate(companyId),
    measureMesGate(companyId),
    measureAnalyticsGate(companyId),
    measureLogisticsGate(companyId),
  ]);

  const dependent = measureDependentGates(esg, wf, mes);

  const gates_open = [esg, wf, mes].filter((g) => g.gate_open).length;
  const total_primary_gates = 3;
  const platform_progress_pct = Math.round(
    ([esg, wf, mes].reduce((sum, g) => sum + g.overall_progress_pct, 0)) / total_primary_gates
  );

  // Next immediate action
  const blockedGates = [esg, wf, mes].filter((g) => !g.gate_open);
  const next_action = blockedGates[0]?.action_required || null;

  return {
    phase: PHASE,
    tracker: 'ADOPTION_PROGRESS_TRACKER',
    ...PILOT_META,
    company_id: companyId,
    summary: {
      primary_gates_open: `${gates_open}/${total_primary_gates}`,
      platform_progress_pct,
      bottleneck: 'operational_evidence_not_architecture',
      next_immediate_action: next_action,
    },
    primary_gates: { esg, workflow: wf, mes },
    secondary_gates: { analytics, logistics },
    dependent_gates: dependent,
    non_implementable_now: [
      { gate: 'M1.25', reason: 'time_based_60_90_days — inicia após M1.22+M1.23+M1.24' },
      { gate: 'M1.26', reason: 'business_decision — 2º tenant produtivo necessário' },
      { gate: 'M1.27', reason: 'evidence_based — depende M1.25' },
      { gate: 'M2.0+', reason: 'strategic_program — depende M1.24+M1.25' },
      { item: 'CEO Anam 15 min', reason: 'human_recording — acção manual CEO' },
      { item: 'Gemini API key', reason: 'external_dependency — Google AI Studio' },
      { item: 'AIOI P17–P20', reason: 'governance_prohibited — ver GET /api/m1/operational-roadmap/p17-p20' },
      { item: 'ML Preditivo / Digital Twin', reason: 'strategic_roadmap — requer 6–12 meses histórico real' },
    ],
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
  };
}

module.exports = {
  PHASE,
  GATE_CRITERIA,
  measureEsgGate,
  measureWorkflowGate,
  measureMesGate,
  measureAnalyticsGate,
  measureLogisticsGate,
  measureDependentGates,
  runAdoptionProgressTracker,
};
