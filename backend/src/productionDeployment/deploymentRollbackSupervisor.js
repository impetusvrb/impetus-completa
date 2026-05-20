'use strict';

const fs = require('fs');
const path = require('path');
const flags = require('./config/productionDeploymentFeatureFlags');
const { logProductionDeployment } = require('./productionDeploymentLogger');
const { recordRollbackPlan } = require('./productionDeploymentTelemetry');

const BACKEND_ROOT = path.join(__dirname, '..', '..');

function assessBackupIntegrity() {
  const backupsDir = path.join(BACKEND_ROOT, 'backups');
  let latest = null;
  if (fs.existsSync(backupsDir)) {
    const entries = fs
      .readdirSync(backupsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, mtime: fs.statSync(path.join(backupsDir, d.name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    latest = entries[0] || null;
  }
  const envBackup = latest
    ? fs.existsSync(path.join(backupsDir, latest.name, '.env.backup'))
    : false;
  return {
    backups_dir: backupsDir,
    latest_backup: latest?.name || null,
    env_snapshot_present: envBackup,
    integrity_ok: !!latest
  };
}

function superviseDeploymentRollback(ctx = {}) {
  const backup = assessBackupIntegrity();
  const snapshot_ready = backup.integrity_ok || ctx.snapshot_ready === true;
  const rollback_safe =
    snapshot_ready &&
    (ctx.validation?.validation_passed !== false || ctx.allow_rollback_with_warnings === true);

  recordRollbackPlan();

  if (!rollback_safe && flags.isDeploymentObservabilityEnabled()) {
    logProductionDeployment('ROLLBACK_NOT_READY', {
      snapshot_ready,
      backup: backup.latest_backup,
      shadow_only: true
    });
  }
  if (!rollback_safe) {
    logProductionDeployment('DEPLOYMENT_ROLLBACK_WARNING', {
      approved_by: ctx.approved_by,
      shadow_only: true
    });
  }

  return {
    rollback_safety: rollback_safe ? 'ready' : 'not_ready',
    rollback_ready: rollback_safe,
    snapshot_readiness: snapshot_ready,
    backup_integrity: backup,
    rollback_plan: {
      steps: [
        { step: 1, action: 'restore_env_from_backup', auto: false },
        { step: 2, action: 'pm2_reload', command: 'pm2 reload impetus-backend --update-env', auto: false },
        { step: 3, action: 'health_check', endpoints: ['/api/health'] },
        { step: 4, action: 'verify_governance_flags', auto: false }
      ],
      auto_rollback: false,
      human_supervision_required: true
    },
    auto_rollback: false
  };
}

module.exports = { superviseDeploymentRollback, assessBackupIntegrity };
