'use strict';

/**
 * SEC-21A — Security readiness gate (snapshots, NCs, rollback).
 */

const fs = require('fs');
const path = require('path');

const DOCS = path.resolve(__dirname, '../../../docs');

function validateSecurityGate() {
  const sec21Rollback = path.join(DOCS, 'evidence/sec-21/rollback-env.snapshot.json');
  const sec21Activation = path.join(DOCS, 'evidence/sec-21/activation-latest.json');
  const sec20 = path.join(DOCS, 'evidence/sec-20/certification-latest.json');

  const rollbackAvailable = fs.existsSync(sec21Rollback);
  const sec21Evidence = fs.existsSync(sec21Activation);
  const sec20Data = fs.existsSync(sec20) ? JSON.parse(fs.readFileSync(sec20, 'utf8')) : null;

  const openNCs = (sec20Data?.ncs || []).filter((nc) => nc.status !== 'CLOSED' && nc.severity !== 'Baixa');
  const criticalNCs = openNCs.filter((nc) => /crítica|critical|alta|high|média|media/i.test(nc.severity || ''));

  let snapshotConsistent = true;
  if (fs.existsSync(sec21Activation)) {
    const act = JSON.parse(fs.readFileSync(sec21Activation, 'utf8'));
    snapshotConsistent = !!(act.operationalStatus || act.activationReport?.ok);
  }

  const pendingApprovals = [];
  try {
    const sec13 = require('../../securityControlledExecution');
    const dash = sec13.getAuditPayload?.();
    if (dash?.dashboard?.pendingApprovals?.length) {
      pendingApprovals.push(...dash.dashboard.pendingApprovals);
    }
  } catch (_e) {
    /* optional */
  }

  const blocking =
    !rollbackAvailable ||
    !sec21Evidence ||
    criticalNCs.length > 0 ||
    !snapshotConsistent;

  return {
    ok: !blocking,
    rollbackAvailable,
    sec21Evidence,
    sec20Present: !!sec20Data,
    openNCs: openNCs.length,
    criticalNCs: criticalNCs.map((n) => n.id),
    snapshotConsistent,
    pendingApprovals: pendingApprovals.length,
    blocking,
    securityReady: !blocking
  };
}

module.exports = { validateSecurityGate };
