'use strict';

/**
 * SEC-04 — Filesystem validation (blueprint, scripts, permissões).
 * Read-only — nunca corrige automaticamente.
 */

const fs = require('fs');
const path = require('path');
const { resolvePath, repoRoot } = require('../baseline/baselineLoader');
const { sha256File } = require('./hashValidator');

const REQUIRED_SCRIPTS = [
  'scripts/integrity-check.sh',
  'scripts/deploy-nginx-hardening.sh'
];

const BLUEPRINT_SPOT_CHECK = [
  'backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/Volume-00-CARTA-MAGNA.md',
  'backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/Volume-10-ROADMAP-ENTERPRISE.md'
];

/**
 * @param {object} baseline
 * @param {object} [ctx] — mock: { missing: [], unexpected: [], blueprintDrift: [] }
 */
function validateFilesystem(baseline, ctx = {}) {
  const findings = [];
  const mockMissing = new Set(ctx.missing || []);
  const mockUnexpected = ctx.unexpected || [];
  const mockBlueprintDrift = new Set(ctx.blueprintDrift || []);

  for (const script of REQUIRED_SCRIPTS) {
    const abs = resolvePath(script);
    if (mockMissing.has(script) || !fs.existsSync(abs)) {
      if (mockMissing.has(script) || !fs.existsSync(abs)) {
        findings.push({ severity: 'CRITICAL', code: 'SCRIPT_MISSING', path: script, message: 'Script crítico ausente' });
      }
    }
  }

  for (const rel of mockUnexpected) {
    findings.push({ severity: 'WARNING', code: 'UNEXPECTED_FILE', path: rel, message: 'Ficheiro novo não presente na baseline' });
  }

  const blueprintBaseline = new Map((baseline.blueprintFiles || []).map((e) => [e.path, e.hash]));

  for (const rel of BLUEPRINT_SPOT_CHECK) {
    if (mockMissing.has(rel)) {
      findings.push({ severity: 'CRITICAL', code: 'BLUEPRINT_MISSING', path: rel, message: 'Volume Blueprint ausente' });
      continue;
    }

    const expected = blueprintBaseline.get(rel);
    const abs = resolvePath(rel);

    if (!fs.existsSync(abs)) {
      findings.push({ severity: 'CRITICAL', code: 'BLUEPRINT_MISSING', path: rel, message: 'Volume Blueprint ausente' });
      continue;
    }

    if (mockBlueprintDrift.has(rel)) {
      findings.push({ severity: 'CRITICAL', code: 'BLUEPRINT_DRIFT', path: rel, message: 'Blueprint hash diverge' });
      continue;
    }

    if (expected) {
      try {
        const current = sha256File(abs);
        if (current !== expected) {
          findings.push({
            severity: 'CRITICAL',
            code: 'BLUEPRINT_DRIFT',
            path: rel,
            expected,
            actual: current,
            message: 'Blueprint hash diverge da baseline'
          });
        }
      } catch (e) {
        findings.push({ severity: 'WARNING', code: 'BLUEPRINT_READ_ERROR', path: rel, message: e?.message });
      }
    }
  }

  const blueprintCount = baseline.blueprintFiles?.length || 0;
  let presentCount = 0;
  for (const entry of (baseline.blueprintFiles || []).slice(0, 50)) {
    if (fs.existsSync(resolvePath(entry.path))) presentCount += 1;
  }

  if (blueprintCount > 0 && presentCount < Math.min(50, blueprintCount) * 0.9 && ctx.skipBlueprintSample !== true) {
    findings.push({
      severity: 'WARNING',
      code: 'BLUEPRINT_SAMPLE_GAP',
      message: `Amostra blueprint: ${presentCount}/50 ficheiros presentes`
    });
  }

  try {
    const gitDeleted = countGitDeleted();
    if (gitDeleted > 0) {
      findings.push({
        severity: 'CRITICAL',
        code: 'GIT_DELETED_FILES',
        count: gitDeleted,
        message: `${gitDeleted} ficheiros tracked apagados no git`
      });
    }
  } catch (_e) {}

  const critical = findings.filter((f) => f.severity === 'CRITICAL');
  const passed = critical.length === 0;
  const status = critical.length > 0 ? 'COMPROMISED' : findings.length > 0 ? 'DEGRADED' : 'OK';

  return {
    kind: 'filesystem',
    status,
    passed,
    findings,
    summary: passed ? 'Filesystem conforme' : `${critical.length} problema(s) crítico(s) de filesystem`,
    blueprintEntries: blueprintCount
  };
}

function countGitDeleted() {
  if (process.env.SEC04_SKIP_GIT_CHECK === 'true') return 0;
  try {
    const { execSync } = require('child_process');
    const root = repoRoot();
    const out = execSync('git ls-files --deleted 2>/dev/null', { encoding: 'utf8', cwd: root, timeout: 5000 });
    return out.split('\n').filter(Boolean).length;
  } catch (_e) {
    return 0;
  }
}

module.exports = { validateFilesystem, REQUIRED_SCRIPTS, BLUEPRINT_SPOT_CHECK };
