'use strict';

const fs = require('fs');
const path = require('path');
const { getBootstrapStatus } = require('./governanceBootstrapCoordinator');
const { mapEntrypoints, writeEntrypointMapDoc } = require('./governanceEntrypointMapper');
const { getAggregateSummary } = require('./governanceShadowRuntimeCollector');
const { evaluateSoftKpiActivation } = require('./softKpiActivationEvaluator');

function generateBootstrapReport(ctx = {}) {
  const status = getBootstrapStatus({ force: ctx.force || true });
  const entrypoints = mapEntrypoints({ live: true });
  const shadow = getAggregateSummary();
  const softKpi = evaluateSoftKpiActivation({ force: true });

  return {
    generated_at: new Date().toISOString(),
    deploy_status: status.pre_deploy_audit?.passed ? 'ready' : 'review_required',
    pm2_runtime_health: ctx.pm2_health || 'verify_manually',
    governance_runtime_status: status,
    shadow_runtime_status: shadow,
    rollout_readiness: status.final_review?.rollout_readiness || 'observe',
    kpi_activation_status: softKpi.safe ? 'soft_candidate' : 'hold',
    divergence_metrics: {
      shadow_alignment: softKpi.shadow_summary?.alignment,
      passed: softKpi.shadow_summary?.passed
    },
    leakage_metrics: { risk: status.final_review?.leakage_risk || 'unknown' },
    overblocking_metrics: { risk: status.final_review?.overblocking_risk || 'unknown' },
    runtime_anomalies: shadow.contextual_anomalies?.count || 0,
    orphan_routes: entrypoints.coverage_gaps.filter((g) => g.runtime_classification === 'unknown'),
    disconnected_pipelines: entrypoints.coverage_gaps,
    governance_coverage_gaps: entrypoints.coverage_gaps,
    stabilization_recommendations: softKpi.safe
      ? ['Proceed with soft KPI after PM2 reload + 24h observation']
      : ['Continue shadow-only observation', 'Review divergence and leakage metrics'],
    next_activation_recommendation: softKpi.recommendation,
    hard_enforcement_active: false
  };
}

function writeBootstrapReportDoc(outPath, ctx = {}) {
  const report = generateBootstrapReport(ctx);
  const lines = [
    '# Governance Production Bootstrap Report',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Deploy status',
    '',
    `- Status: **${report.deploy_status}**`,
    `- Mode: shadow + observability (no hard enforcement)`,
    `- KPI activation: **${report.kpi_activation_status}**`,
    '',
    '## Metrics',
    '',
    '```json',
    JSON.stringify(
      {
        divergence: report.divergence_metrics,
        leakage: report.leakage_metrics,
        overblocking: report.overblocking_metrics,
        soft_kpi: report.next_activation_recommendation
      },
      null,
      2
    ),
    '```',
    '',
    '## Coverage gaps',
    '',
    ...report.governance_coverage_gaps.map((g) => `- ${g.id}: ${g.route}`),
    '',
    '## Stabilization',
    '',
    ...report.stabilization_recommendations.map((r) => `- ${r}`),
    '',
    '## Full status',
    '',
    '```json',
    JSON.stringify(report.governance_runtime_status, null, 2).slice(0, 8000),
    '```'
  ];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return { written: outPath, report };
}

module.exports = { generateBootstrapReport, writeBootstrapReportDoc };
