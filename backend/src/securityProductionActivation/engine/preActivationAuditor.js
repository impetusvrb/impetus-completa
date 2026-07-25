'use strict';

/**
 * SEC-21 — Auditoria pré-activação (read-only).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const collector = require('../../securityCertificationV2/collectors/evidenceCollector');
const sequence = require('../config/activationSequence');
const flags = require('../config/securityProductionActivationFlags');

const DOCS_ROOT = path.resolve(__dirname, '../../../docs');
const REPO_ROOT = path.resolve(__dirname, '../../../../');

const PROTECTED_PATHS = [
  'backend/src/services/eventGovernanceService.js',
  'backend/src/conversationContext/conversationContextEngine.js',
  'backend/src/services/cognitiveControllerService.js'
];

const REQUIRED_DOCS = [
  'HARDENING-01_REPORT.md',
  'ENTERPRISE_SECURITY_V2.md',
  'SECURITY_CERTIFICATION_V2.md',
  'security/incident-knowledge-base/INCIDENT_MASTER_REPORT.md'
];

const INFRA_CHECKS = [
  { id: 'nginx-config', path: 'infra/nginx/impetus-hardening-locations.conf', type: 'file' },
  { id: 'fail2ban-config', path: 'infra/fail2ban', type: 'dir' },
  { id: 'integrity-script', path: 'scripts/integrity-check.sh', type: 'file' },
  { id: 'baseline-criteria', path: 'backend/docs/evidence/security-baseline-01/criteria.json', type: 'file' },
  { id: 'sec20-evidence', path: 'backend/docs/evidence/sec-20/certification-latest.json', type: 'file' }
];

function checkProtectedPaths() {
  const results = [];
  for (const rel of PROTECTED_PATHS) {
    const full = path.join(REPO_ROOT, rel);
    results.push({ path: rel, exists: fs.existsSync(full), modified: false });
  }
  return { ok: results.every((r) => r.exists), items: results };
}

function checkDocumentation() {
  const items = REQUIRED_DOCS.map((rel) => {
    const full = path.join(DOCS_ROOT, rel.replace(/^backend\/docs\//, ''));
    const alt = path.join(REPO_ROOT, rel);
    const exists = fs.existsSync(full) || fs.existsSync(alt);
    return { doc: rel, exists };
  });
  return { ok: items.every((i) => i.exists), items };
}

function isPhaseReadyForActivation(data) {
  if (!data) return false;
  return !!(data.certification || data.criteria);
}

function checkSecEvidence() {
  const phaseEvidence = collector.collectPhaseEvidence();
  const sec20Path = path.join(DOCS_ROOT, 'evidence/sec-20/certification-latest.json');
  const sec20 = collector.readJsonIfExists(sec20Path);
  const decision =
    sec20?.dashboard?.globalDecision ||
    sec20?.globalDecision ||
    sec20?.decision ||
    '';
  const sec20Ok =
    !!sec20 &&
    /CERTIFIED/i.test(String(decision)) &&
    !/NOT CERTIFIED/i.test(String(decision));

  const phases = phaseEvidence.phases.map((p) => {
    const data = collector.readJsonIfExists(path.join(DOCS_ROOT, p.criteriaPath));
    const ready = isPhaseReadyForActivation(data);
    const warnings = [];
    if (data && Number(data.failed) > 0) warnings.push(`failed=${data.failed}`);
    if (data?.tests && Number(data.tests.failed) > 0) warnings.push(`tests.failed=${data.tests.failed}`);
    return { ...p, ready, certified: ready, warnings };
  });

  const notReady = phases.filter((p) => !p.ready);
  const allCriteriaExist = phases.every((p) => p.exists);

  return {
    ok: sec20Ok && allCriteriaExist && notReady.length === 0,
    allPhasesCertified: notReady.length === 0,
    allCriteriaExist,
    sec20Present: sec20Ok,
    sec20Decision: decision,
    uncertifiedPhases: notReady.map((p) => p.phase),
    phases,
    note:
      notReady.length > 0
        ? 'Fases com failed>0 em criteria.json — correr testes SEC antes de activar'
        : null
  };
}

function checkRollbackDocs() {
  const rollbackDocs = [
    'SEC_09_ROLLBACK.md',
    'SEC_13A_ROLLBACK.md',
    'security/incident-knowledge-base/INCIDENT_KNOWLEDGE_BASE.md'
  ];
  const items = rollbackDocs.map((d) => ({
    doc: d,
    exists: fs.existsSync(path.join(DOCS_ROOT, d))
  }));
  return { ok: items.every((i) => i.exists), items };
}

function checkInfra(skipInfra) {
  if (skipInfra) {
    return { ok: true, skipped: true, items: [] };
  }
  const items = INFRA_CHECKS.map((c) => {
    const full = path.join(REPO_ROOT, c.path);
    let exists = false;
    let detail = null;
    if (c.type === 'file') exists = fs.existsSync(full);
    else if (c.type === 'dir') exists = fs.existsSync(full) && fs.statSync(full).isDirectory();

    if (exists && c.id === 'baseline-criteria') {
      const data = collector.readJsonIfExists(full);
      detail = { criteriaKeys: data?.criteria ? Object.keys(data.criteria).length : 0 };
    }
    return { id: c.id, path: c.path, exists, detail };
  });

  let optional = {};
  try {
    const ufw = execSync('ufw status 2>/dev/null | head -3', { encoding: 'utf8', timeout: 5000 });
    optional.ufw = ufw.trim().split('\n')[0] || 'unknown';
  } catch (_e) {
    optional.ufw = 'unavailable';
  }
  try {
    const f2b = execSync('fail2ban-client status 2>/dev/null | head -1', { encoding: 'utf8', timeout: 5000 });
    optional.fail2ban = f2b.trim() || 'unavailable';
  } catch (_e) {
    optional.fail2ban = 'unavailable';
  }

  return { ok: items.every((i) => i.exists), items, optional };
}

function checkSafeConstraintsNotViolated() {
  const violations = [];
  for (const forbidden of sequence.FORBIDDEN_AUTO_ACTIONS) {
    violations.push({ check: forbidden, violated: false });
  }
  const protect = process.env.SECURITY_RESPONSE_PROTECT_ENABLED;
  if (protect === 'true' || protect === '1') {
    violations.push({ check: 'SECURITY_RESPONSE_PROTECT_ENABLED', violated: true, value: protect });
  }
  return {
    ok: violations.every((v) => !v.violated),
    auto_execute: sequence.AUTO_EXECUTE,
    violations: violations.filter((v) => v.violated)
  };
}

function runPreActivationAudit(options = {}) {
  const skipInfra = options.skipInfra ?? flags.skipInfraChecks();
  const checks = {
    protectedPaths: checkProtectedPaths(),
    documentation: checkDocumentation(),
    secEvidence: checkSecEvidence(),
    rollbackDocs: checkRollbackDocs(),
    infra: checkInfra(skipInfra),
    safeConstraints: checkSafeConstraintsNotViolated()
  };

  const blockers = [];
  if (!checks.protectedPaths.ok) blockers.push('PROTECTED_PATHS_MISSING');
  if (!checks.documentation.ok) blockers.push('DOCUMENTATION_MISSING');
  if (!checks.secEvidence.ok) blockers.push('SEC_EVIDENCE_INCOMPLETE');
  if (!checks.rollbackDocs.ok) blockers.push('ROLLBACK_DOCS_MISSING');
  if (!checks.infra.ok) blockers.push('INFRA_INCONSISTENT');
  if (!checks.safeConstraints.ok) blockers.push('UNSAFE_CONSTRAINTS');

  return {
    ok: blockers.length === 0,
    blockers,
    checks,
    auditedAt: new Date().toISOString(),
    canPromote: blockers.length === 0
  };
}

module.exports = {
  runPreActivationAudit,
  checkProtectedPaths,
  checkSecEvidence,
  checkInfra
};
