'use strict';

const { validatePilotFlagActivation } = require('./ops002FlagActivationValidator');
const { validateWorkspacePublication } = require('./ops002WorkspacePublicationValidator');
const { validatePilotRbac, validateRollbackProcedure } = require('./ops002RbacRollbackValidator');
const { runPilotSmokeTests } = require('./ops002SmokeTestRunner');

function _resolveVerdict(ctx) {
  if (ctx.flags.classification === 'FAIL' || ctx.workspace.classification === 'FAIL') {
    return 'PILOT ROLLOUT FAILED';
  }
  if (ctx.smoke.classification === 'FAIL' || ctx.rbac.classification === 'FAIL') {
    return 'PILOT ROLLOUT FAILED';
  }
  if (
    ctx.flags.classification === 'WARNING' ||
    ctx.workspace.classification === 'WARNING' ||
    ctx.smoke.classification === 'WARNING'
  ) {
    return 'PILOT ROLLOUT SUCCESSFUL WITH OBSERVATIONS';
  }
  return 'PILOT ROLLOUT SUCCESSFUL';
}

function _operationalRisks(ctx) {
  const risks = [];
  if (ctx.workspace.integration.find((i) => i.id === 'layout_global_menu')?.status === 'WARNING') {
    risks.push('Entrada sidebar global WMS-004 não integrada — acesso via URL directa / menu interno do workspace');
  }
  if (!ctx.flags.rows.find((r) => r.flag === 'IMPETUS_WMS_API_ENABLED') || ctx.flags.rows.find((r) => r.flag === 'IMPETUS_WMS_API_ENABLED')?.status === 'WARNING') {
    risks.push('API WMS-003 requer IMPETUS_WMS_API_ENABLED no backend');
  }
  risks.push('Flags VITE são globais ao build — rollout afecta todos os tenants deste ambiente');
  risks.push('Validação com utilizadores reais recomendada antes de ARC-003');
  if (ctx.rollback.rollback_immediate) {
    risks.push('Rollback validado — reversão de flags restaura comportamento OPS-001');
  }
  return risks;
}

async function runPilotRolloutVerification(ctx = {}) {
  const t0 = Date.now();
  const flags = validatePilotFlagActivation();
  const workspace = validateWorkspacePublication();
  const rbac = validatePilotRbac();
  const rollback = validateRollbackProcedure();
  const smoke = await runPilotSmokeTests(ctx);

  const snapshot = { flags, workspace, rbac, rollback, smoke };
  const verdict = _resolveVerdict(snapshot);
  const risks = _operationalRisks({ ...snapshot, rollback });

  return Object.freeze({
    ok: verdict !== 'PILOT ROLLOUT FAILED',
    mode: 'PILOT_ROLLOUT',
    delivery: 'OPS-002',
    baseline_id: 'BASELINE-SUPPLY-v2.0',
    ops001_ref: 'DEPLOYMENT VERIFIED WITH FINDINGS',
    verdict,
    flags,
    workspace,
    rbac,
    rollback,
    smoke,
    operational_risks: risks,
    duration_ms: Date.now() - t0,
    timestamp: new Date().toISOString()
  });
}

module.exports = { runPilotRolloutVerification };
