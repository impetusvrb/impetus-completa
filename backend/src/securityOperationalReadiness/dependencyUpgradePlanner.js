'use strict';

/**
 * APPSEC-02A — Dependency Upgrade Planner (read-only plano; não executa upgrade).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRIORITY_PACKAGES = Object.freeze([
  { name: 'axios', priority: 'P0', breaking_risk: 'low', rollback: 'package-lock.json + npm ci' },
  { name: 'ws', priority: 'P0', breaking_risk: 'medium', rollback: 'package-lock.json + npm ci' },
  { name: 'xlsx', priority: 'P1', breaking_risk: 'high', rollback: 'pin previous version in package.json' },
  { name: 'form-data', priority: 'P1', breaking_risk: 'low', rollback: 'npm ci' },
  { name: 'nodemailer', priority: 'P2', breaking_risk: 'medium', rollback: 'npm ci' },
  { name: 'protobufjs', priority: 'P2', breaking_risk: 'medium', rollback: 'npm ci' },
  { name: 'fast-uri', priority: 'P2', breaking_risk: 'low', rollback: 'npm ci' },
  { name: '@grpc/grpc-js', priority: 'P2', breaking_risk: 'medium', rollback: 'npm ci' }
]);

function runAudit(cwd) {
  try {
    const out = execSync('npm audit --json', { cwd, encoding: 'utf8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (e) {
    try {
      return JSON.parse(e.stdout || '{}');
    } catch {
      return { error: e.message, vulnerabilities: {} };
    }
  }
}

function getInstalledVersion(cwd, pkg) {
  try {
    const p = path.join(cwd, 'node_modules', pkg, 'package.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')).version;
  } catch {
    return null;
  }
}

function planForPackage(pkgSpec, auditJson, cwd) {
  const entry = auditJson.vulnerabilities?.[pkgSpec.name];
  if (!entry) {
    return {
      package: pkgSpec.name,
      status: 'clean',
      priority: pkgSpec.priority,
      current_version: getInstalledVersion(cwd, pkgSpec.name),
      risk: 'none',
      compatibility: 'ok',
      breaking_changes: 'none',
      rollback: pkgSpec.rollback,
      action: 'none'
    };
  }

  const severity = entry.severity || 'moderate';
  const riskScore = severity === 'critical' ? 10 : severity === 'high' ? 8 : severity === 'moderate' ? 5 : 2;

  return {
    package: pkgSpec.name,
    status: 'vulnerable',
    priority: pkgSpec.priority,
    current_version: getInstalledVersion(cwd, pkgSpec.name),
    severity,
    risk: riskScore,
    via: (entry.via || []).map((v) => (typeof v === 'string' ? v : v.title)).filter(Boolean).slice(0, 3),
    fix_available: Boolean(entry.fixAvailable),
    compatibility: entry.fixAvailable ? 'test required' : 'manual review',
    breaking_changes: pkgSpec.breaking_risk,
    rollback: pkgSpec.rollback,
    action: entry.fixAvailable ? 'npm update ' + pkgSpec.name + ' (after regression)' : 'evaluate alternative or override'
  };
}

/**
 * @param {string} [repoRoot]
 */
function generateDependencyUpgradePlan(repoRoot) {
  const root = repoRoot || path.join(__dirname, '../../..');
  const backendRoot = path.join(root, 'backend');
  const frontendRoot = path.join(root, 'frontend');

  const backendAudit = runAudit(backendRoot);
  const frontendAudit = fs.existsSync(frontendRoot) ? runAudit(frontendRoot) : null;

  const backendPlans = PRIORITY_PACKAGES.map((p) => planForPackage(p, backendAudit, backendRoot));
  const frontendPlans = frontendAudit
    ? PRIORITY_PACKAGES.filter((p) => ['axios', 'ws', 'xlsx'].includes(p.name)).map((p) =>
        planForPackage(p, frontendAudit, frontendRoot)
      )
    : [];

  const vulnerable = [...backendPlans, ...frontendPlans].filter((p) => p.status === 'vulnerable');

  return {
    schema_version: 'dependency_upgrade_plan_v1',
    generated_at: new Date().toISOString(),
    backend: { plans: backendPlans, audit_summary: backendAudit.metadata?.vulnerabilities || {} },
    frontend: frontendAudit ? { plans: frontendPlans, audit_summary: frontendAudit.metadata?.vulnerabilities || {} } : null,
    vulnerable_count: vulnerable.length,
    upgrade_priority_order: vulnerable.sort((a, b) => b.risk - a.risk).map((p) => p.package),
    regression_command: 'node backend/src/tests/securityApplication/APPSEC_01.test.js && node backend/src/tests/securityApplicationValidation/APPSEC_02.test.js',
    plan_complete: true,
    auto_upgrade: false,
    recommendation: vulnerable.length
      ? 'Executar upgrades P0 (axios, ws) em staging; regressão completa antes de produção'
      : 'Dependências prioritárias sem vulnerabilidades conhecidas'
  };
}

module.exports = {
  PRIORITY_PACKAGES,
  generateDependencyUpgradePlan
};
