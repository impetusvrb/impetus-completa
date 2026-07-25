'use strict';

/**
 * APPSEC-01 — Enterprise Dependency Governance
 */

const { execSync } = require('child_process');
const path = require('path');

const PRIORITY_PACKAGES = Object.freeze([
  'axios',
  'ws',
  'xlsx',
  'form-data',
  'nodemailer',
  'protobufjs',
  'fast-uri',
  'fast-xml-builder',
  '@grpc/grpc-js'
]);

/**
 * @param {string} packageRoot — backend/ ou frontend/
 */
function runNpmAuditJson(packageRoot) {
  try {
    const out = execSync('npm audit --json', {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000
    });
    return JSON.parse(out);
  } catch (e) {
    if (e.stdout) {
      try {
        return JSON.parse(e.stdout);
      } catch (_) { /* fall through */ }
    }
    return { error: e.message, vulnerabilities: {} };
  }
}

function summarizeAudit(auditJson) {
  const meta = auditJson.metadata?.vulnerabilities || {};
  return {
    total: meta.total || 0,
    critical: meta.critical || 0,
    high: meta.high || 0,
    moderate: meta.moderate || 0,
    low: meta.low || 0
  };
}

function extractPriorityFindings(auditJson) {
  const vulns = auditJson.vulnerabilities || {};
  const findings = [];
  for (const pkg of PRIORITY_PACKAGES) {
    const entry = vulns[pkg];
    if (!entry) continue;
    findings.push({
      package: pkg,
      severity: entry.severity,
      via: (entry.via || []).map((v) => (typeof v === 'string' ? v : v.title)).filter(Boolean),
      range: entry.range,
      fixAvailable: Boolean(entry.fixAvailable)
    });
  }
  return findings;
}

/**
 * @param {string} repoRoot
 */
function generateDependencyRiskReport(repoRoot) {
  const root = repoRoot || path.join(__dirname, '../..');
  const backendRoot = path.join(root);
  const frontendRoot = path.join(root, '../frontend');

  const backendAudit = runNpmAuditJson(backendRoot);
  const frontendAudit = fsExists(frontendRoot) ? runNpmAuditJson(frontendRoot) : null;

  const report = {
    schema_version: 'appsec_dependency_governance_v1',
    generated_at: new Date().toISOString(),
    backend: {
      summary: summarizeAudit(backendAudit),
      priority_findings: extractPriorityFindings(backendAudit),
      error: backendAudit.error || null
    },
    frontend: frontendAudit
      ? {
          summary: summarizeAudit(frontendAudit),
          priority_findings: extractPriorityFindings(frontendAudit),
          error: frontendAudit.error || null
        }
      : null,
    recommendations: [
      'Atualizar axios, ws e xlsx para versões patched compatíveis',
      'Executar npm audit fix --dry-run antes de promoção',
      'Manter rollback documentado por pacote crítico'
    ]
  };

  const highCount =
    (report.backend.summary.high || 0) + (report.frontend?.summary?.high || 0);
  report.risk_level = highCount >= 5 ? 'elevated' : highCount >= 1 ? 'moderate' : 'low';

  return report;
}

function fsExists(p) {
  try {
    require('fs').accessSync(p);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  PRIORITY_PACKAGES,
  runNpmAuditJson,
  summarizeAudit,
  extractPriorityFindings,
  generateDependencyRiskReport
};
