'use strict';

const fs = require('fs');
const path = require('path');

const MODULE_CHECKS = [
  'productionRollout/productionRolloutCoordinator',
  'runtimeValidation/governanceRuntimeValidation',
  'governanceOperations/governanceOperationsService',
  'governanceBootstrap/governanceBootstrapCoordinator',
  'finalReview/integratedGovernanceReview',
  'governanceActivation/governanceActivationRuntime',
  'policyEngine/cognitiveGovernanceFacade',
  'policyEngine/shadow/governanceShadowComparator'
];

function _tryRequire(rel) {
  try {
    require.resolve(path.join(__dirname, '..', rel));
    require(path.join(__dirname, '..', rel));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function _checkMigrations() {
  const migDir = path.join(__dirname, '..', '..', 'migrations');
  const altDir = path.join(__dirname, '..', 'migrations');
  const dir = fs.existsSync(migDir) ? migDir : altDir;
  if (!fs.existsSync(dir)) return { ok: true, note: 'migrations_dir_not_found_skipped', files: [] };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql') || f.endsWith('.js'));
  const destructive = files.filter((f) => /drop|truncate|delete\s+from/i.test(f));
  return {
    ok: destructive.length === 0,
    dir,
    file_count: files.length,
    destructive_pending: destructive
  };
}

function _checkInternalRoutesGuarded() {
  const serverPath = path.join(__dirname, '..', 'server.js');
  const content = fs.readFileSync(serverPath, 'utf8');
  const governanceMounts = (content.match(/cognitiveGovernance/g) || []).length;
  const internalNet = (content.match(/internalNet\('governance'\)/g) || []).length;
  return {
    ok: governanceMounts > 0 && internalNet >= governanceMounts - 1,
    governance_route_refs: governanceMounts,
    internal_net_governance: internalNet
  };
}

function runPreDeployAudit(ctx = {}) {
  const modules = MODULE_CHECKS.map((m) => ({ module: m, ..._tryRequire(m) }));
  const migrations = _checkMigrations();
  const internalGuards = _checkInternalRoutesGuarded();

  const circular_risk = modules.filter((m) => !m.ok && String(m.error).includes('circular'));
  const failed_modules = modules.filter((m) => !m.ok);

  const passed =
    failed_modules.length === 0 &&
    migrations.ok &&
    internalGuards.ok &&
    circular_risk.length === 0;

  return {
    passed,
    audited_at: new Date().toISOString(),
    migrations,
    modules,
    internal_route_guards: internalGuards,
    tenant_admins: { ok: true, note: 'verify_via_db_in_deploy_script' },
    support_recovery: { ok: true, note: 'verify_via_db_in_deploy_script' },
    governance_tables: { ok: true, note: 'audit_feed_jsonl_optional' },
    pm2_health: { ok: true, note: 'verify_via_pm2_list_in_deploy_script' },
    destructive_migration_pending: migrations.destructive_pending?.length > 0,
    auto_deploy: false
  };
}

function writePreDeployAuditDoc(outPath, audit) {
  const a = audit || runPreDeployAudit();
  const lines = [
    '# Pre-Production Governance Audit',
    '',
    `Generated: ${a.audited_at}`,
    '',
    `**Overall:** ${a.passed ? 'PASS' : 'FAIL'}`,
    '',
    '## Migrations',
    '',
    '```json',
    JSON.stringify(a.migrations, null, 2),
    '```',
    '',
    '## Module integrity',
    '',
    '| Module | OK |',
    '|--------|-----|',
    ...a.modules.map((m) => `| ${m.module} | ${m.ok ? 'yes' : 'no'} |`),
    '',
    '## Internal route guards',
    '',
    '```json',
    JSON.stringify(a.internal_route_guards, null, 2),
    '```',
    '',
    '## Manual checks (deploy script)',
    '',
    '- PM2 process health',
    '- tenant_admins integrity',
    '- support_recovery integrity',
    '- backup before reload'
  ];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return { written: outPath, audit: a };
}

module.exports = { runPreDeployAudit, writePreDeployAuditDoc };
