'use strict';

/**
 * ENTERPRISE FINAL PRODUCTION READINESS — orquestrador estático + smoke de tooling.
 *
 * npm run test:enterprise-final-readiness
 *
 * Opcional:
 *   IMPETUS_FINAL_READINESS_RUN_BUILD=true       — corre `npm run build` no frontend
 *   IMPETUS_FINAL_READINESS_MIGRATION_DRY=true  — corre migrations --dry-run
 */

const fs = require('fs');
const path = require('path');

const { validate: vRuntime } = require('./enterpriseRuntimeIntegrityValidator');
const { validate: vStartup } = require('./startupIntegrityValidator');
const { validate: vGov } = require('./featureGovernanceIntegrityValidator');
const { validate: vIndustrial } = require('./industrialEventIntegrityValidator');
const { validate: vReplay } = require('./enterpriseReplayReadinessValidator');
const { validate: vTelemetry } = require('./qualityTelemetryReadinessValidator');
const { validate: vCognitive } = require('./qualityCognitiveReadinessValidator');
const { validate: vRollout } = require('./qualityRolloutReadinessValidator');
const { validate: vMulti } = require('./multiTenantIndustrialSafetyValidator');
const { validate: vFrontend } = require('./frontendEnterpriseReadinessValidator');
const { validate: vObs } = require('./enterpriseObservabilityReadinessValidator');
const { validate: vSat } = require('./runtimeSaturationValidator');
const { validate: vBuild } = require('./buildIntegrityValidator');
const { validate: vApi } = require('./enterpriseApiSurfaceValidator');
const { validate: vMigrate } = require('./migrationConsistencyValidator');
const { validate: vPm2 } = require('./pm2RuntimeReadinessValidator');

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const AMBER = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function verdictLine(phases) {
  const totalFail = phases.reduce((n, p) => n + p.failed, 0);
  const totalWarn = phases.reduce((n, p) => n + p.warned, 0);
  if (totalFail > 0) return { label: 'NOT READY', detail: `${totalFail} verificação(ões) com falha` };
  if (totalWarn > 0) return { label: 'READY WITH RESTRICTIONS', detail: `${totalWarn} aviso(s); rever antes de ativação ampla` };
  const signOff = process.env.IMPETUS_FINAL_READINESS_FULL_SIGN_OFF === 'true';
  if (signOff) return { label: 'ENTERPRISE READY', detail: 'Gate estático OK + sign-off explícito via env (ainda sujeito a soak em staging)' };
  return {
    label: 'ENTERPRISE READY FOR CONTROLLED ACTIVATION',
    detail: 'Gate estático sem falhas nem avisos; ativar primeiro em tenant piloto com observabilidade ativa'
  };
}

function printPhase(p) {
  const col =
    p.verdict === 'fail' ? RED : p.verdict === 'warn' ? AMBER : GREEN;
  console.log(`\n${BOLD}${p.phaseId} — ${p.title}${RESET} ${col}[${p.verdict.toUpperCase()}]${RESET}`);
  for (const c of p.checks) {
    const sym = c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✗';
    const cc = c.status === 'pass' ? GREEN : c.status === 'warn' ? AMBER : RED;
    const det = c.detail ? ` — ${c.detail}` : '';
    console.log(`  ${cc}${sym}${RESET} ${c.id}${det}`);
  }
}

function main() {
  console.log(`${BOLD}${CYAN}IMPETUS — ENTERPRISE FINAL PRODUCTION READINESS${RESET}`);
  console.log(`${CYAN}${new Date().toISOString()}${RESET}`);

  const phases = [
    vRuntime(),
    vStartup(),
    vGov(),
    vIndustrial(),
    vReplay(),
    vTelemetry(),
    vCognitive(),
    vRollout(),
    vMulti(),
    vFrontend(),
    vObs(),
    vSat(),
    vBuild(),
    vApi(),
    vMigrate(),
    vPm2()
  ];

  for (const p of phases) printPhase(p);

  const { label, detail } = verdictLine(phases);
  const vCol = label === 'NOT READY' ? RED : label.includes('RESTRICTIONS') ? AMBER : GREEN;
  console.log(`\n${BOLD}VEREDICTO:${RESET} ${vCol}${label}${RESET}`);
  console.log(`${detail}`);

  const reportPath = path.join(__dirname, '../../../docs/ENTERPRISE_FINAL_PRODUCTION_READINESS_REPORT.md');
  if (fs.existsSync(reportPath))
    console.log(`\nRelatório complementar: ${path.relative(process.cwd(), reportPath)}`);

  const anyFail = phases.some((p) => p.verdict === 'fail');
  process.exit(anyFail ? 1 : 0);
}

main();
