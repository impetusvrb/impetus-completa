'use strict';

const fs = require('fs');
const path = require('path');
const { getBootstrapStatus, startGlobalShadowObservation } = require('./governanceBootstrapCoordinator');
const { mapEntrypoints, writeEntrypointMapDoc } = require('./governanceEntrypointMapper');
const { getAggregateSummary } = require('./governanceShadowRuntimeCollector');
const { evaluateSoftKpiActivation } = require('./softKpiActivationEvaluator');
const { scanCognitiveRoutes } = require('./cognitiveRouteScanner');
const { runPreDeployAudit } = require('./preDeployGovernanceAudit');

function generateRuntimeObservationReport(ctx = {}) {
  if (ctx.start_observation !== false) {
    startGlobalShadowObservation({ tenant_id: ctx.tenant_id });
  }

  const status = getBootstrapStatus({ force: true });
  const entrypoints = mapEntrypoints({ live: true });
  const shadow = getAggregateSummary();
  const softKpi = evaluateSoftKpiActivation({ force: true });
  const codeScan = scanCognitiveRoutes();
  const preDeploy = runPreDeployAudit();

  const gaps = [
    ...entrypoints.coverage_gaps,
    ...codeScan.ungoverned.map((u) => ({ id: u.file, route: u.file, runtime_classification: 'ungoverned' }))
  ];

  return {
    generated_at: new Date().toISOString(),
    mode: 'shadow_observability_first',
    hard_enforcement_active: false,
    runtime_health: {
      governance_health: status.final_review?.governance_health,
      runtime_stability: status.final_review?.runtime_stability,
      production_status: status.final_review?.production_status,
      stabilization: status.production_status?.observation?.stabilization
    },
    governance_coverage: {
      entrypoints_total: entrypoints.total,
      governed: entrypoints.governed_count,
      shadow_only: entrypoints.shadow_only_count,
      gaps_count: gaps.length
    },
    entrypoint_gaps: gaps,
    orphan_pipelines: codeScan.ungoverned,
    legacy_route_usage: codeScan.legacy,
    code_scan_summary: {
      total_cognitive_files: codeScan.total_cognitive_files,
      ungoverned_count: codeScan.ungoverned.length,
      legacy_count: codeScan.legacy.length
    },
    leakage_risk: status.final_review?.leakage_risk || softKpi.readiness?.leakage_risk,
    divergence_metrics: {
      shadow_alignment: softKpi.shadow_summary?.alignment,
      shadow_passed: softKpi.shadow_summary?.passed,
      aggregate_divergence_events: shadow.shadow_divergence?.count || 0
    },
    contextual_degradation: {
      risk: status.final_review?.overblocking_risk,
      contextual_anomalies: shadow.contextual_anomalies?.count || 0
    },
    overblocking_risk: status.final_review?.overblocking_risk,
    runtime_anomalies: shadow,
    rollout_readiness: status.final_review?.rollout_readiness,
    kpi_readiness: {
      safe: softKpi.safe,
      recommendation: softKpi.recommendation,
      metrics: softKpi.metrics,
      auto_activate: false
    },
    stabilization_recommendations: softKpi.safe
      ? [
          'Manter observação shadow 7 dias',
          'KPI soft activation é candidato — activação manual apenas',
          'Não activar chat/summary/boundary até nova revisão'
        ]
      : [
          'Continuar apenas shadow + telemetry',
          'Adiar KPI até métricas estáveis',
          'Revisar hotspots ungoverned listados'
        ],
    pre_deploy_audit_passed: preDeploy.passed,
    auto_activation: false
  };
}

function writeRuntimeObservationReportDoc(outPath, ctx = {}) {
  const report = generateRuntimeObservationReport(ctx);
  const docDir = path.dirname(outPath);
  writeEntrypointMapDoc(path.join(docDir, 'runtime-governance-entrypoint-map.md'));

  const lines = [
    '# Governance Runtime Observation Report',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Executive summary',
    '',
    `- **Mode:** ${report.mode}`,
    `- **Hard enforcement:** ${report.hard_enforcement_active}`,
    `- **Governance health:** ${report.runtime_health.governance_health ?? 'n/a'}`,
    `- **Rollout readiness:** ${report.rollout_readiness ?? 'n/a'}`,
    `- **KPI soft safe:** ${report.kpi_readiness.safe}`,
    '',
    '## 1. Runtime health',
    '',
    '```json',
    JSON.stringify(report.runtime_health, null, 2),
    '```',
    '',
    '## 2. Governance coverage',
    '',
    '```json',
    JSON.stringify(report.governance_coverage, null, 2),
    '```',
    '',
    '## 3. Entrypoint gaps (priority)',
    '',
    ...report.entrypoint_gaps.slice(0, 30).map((g) => `- **${g.id || g.route}** — ${g.runtime_classification}`),
    '',
    '## 4. Orphan pipelines (code scan)',
    '',
    ...report.orphan_pipelines.slice(0, 20).map((o) => `- \`${o.file}\``),
    '',
    '## 5. Legacy routes',
    '',
    ...report.legacy_route_usage.slice(0, 15).map((l) => `- \`${l.file}\``),
    '',
    '## 6. Leakage & divergence',
    '',
    '```json',
    JSON.stringify(
      { leakage: report.leakage_risk, divergence: report.divergence_metrics, overblocking: report.overblocking_risk },
      null,
      2
    ),
    '```',
    '',
    '## 7. Contextual degradation',
    '',
    '```json',
    JSON.stringify(report.contextual_degradation, null, 2),
    '```',
    '',
    '## 8. Shadow runtime aggregate',
    '',
    '```json',
    JSON.stringify(report.runtime_anomalies, null, 2),
    '```',
    '',
    '## 9. KPI readiness (manual only)',
    '',
    '```json',
    JSON.stringify(report.kpi_readiness, null, 2),
    '```',
    '',
    '## 10. Stabilization recommendations',
    '',
    ...report.stabilization_recommendations.map((r) => `- ${r}`),
    '',
    '## Code scan summary',
    '',
    '```json',
    JSON.stringify(report.code_scan_summary, null, 2),
    '```'
  ];

  fs.mkdirSync(docDir, { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  fs.writeFileSync(
    path.join(docDir, 'governance-runtime-observation-report.json'),
    JSON.stringify(report, null, 2)
  );
  return { written: outPath, report };
}

module.exports = { generateRuntimeObservationReport, writeRuntimeObservationReportDoc };
