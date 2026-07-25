'use strict';

/**
 * SEC-21B — Análise de drift individual (read-only).
 */

const fs = require('fs');
const { compareManifest, loadFilesystemDrifts, getIntegritySnapshot } = require('../services/manifestComparisonService');
const { classifyDivergence } = require('./criticalFileClassifier');

function mergeDivergenceSources(manifestComparison, filesystemDrifts) {
  const byPath = new Map();

  for (const d of manifestComparison.divergences) {
    byPath.set(d.path, { ...d, source: 'manifest' });
  }

  for (const f of filesystemDrifts) {
    const rel = f.path || f.file;
    if (!rel) continue;
    if (!byPath.has(rel)) {
      byPath.set(rel, {
        path: rel,
        issue: 'BLUEPRINT_DRIFT',
        expectedSha256: f.expected,
        actualSha256: f.actual,
        source: 'filesystem_validation'
      });
    }
  }

  return [...byPath.values()];
}

function analyzeDrifts() {
  const manifestComparison = compareManifest();
  const filesystemDrifts = loadFilesystemDrifts();
  const integrity = getIntegritySnapshot();
  const rawDivergences = mergeDivergenceSources(manifestComparison, filesystemDrifts);

  const analyzed = rawDivergences.map((entry) => {
    const classified = classifyDivergence(entry);
    return {
      ...classified,
      source: entry.source,
      questions: {
        hashDiverged: classified.hashDiverged,
        why: classified.rationale,
        causingSec: classified.causingSec,
        certified: classified.certified,
        documentationPresent: classified.documentation.length > 0,
        architectureApproved: classified.architectureApproved,
        operationalChange: classified.operationalChange,
        accidentalChange: classified.accidentalChange,
        shouldRemain: classified.shouldRemain,
        shouldRevert: classified.shouldRevert,
        eligibleForBaseline: classified.eligibleForBaseline
      }
    };
  });

  return {
    integrityBefore: integrity.integrityScore,
    integrityStatusBefore: integrity.integrityStatus,
    hashDriftCount: integrity.hashDrift,
    hashMissingCount: integrity.hashMissing,
    manifestComparison,
    filesystemDrifts,
    analyzed,
    totalDivergences: analyzed.length
  };
}

function projectIntegrityAfterSync(integrityBefore, analyzed, manifestComparison) {
  const pending = analyzed.filter((a) => !a.eligibleForBaseline);
  const rejected = analyzed.filter((a) => a.shouldRevert);
  if (pending.length > 0 || rejected.length > 0) {
    return Math.min(integrityBefore, 0.94);
  }

  const totalEntries = manifestComparison.manifestEntries || 1;
  const resolvedCount = analyzed.filter((a) => a.eligibleForBaseline).length;
  const remainingDrift = manifestComparison.divergences.length - resolvedCount;

  if (remainingDrift <= 0 && analyzed.every((a) => a.eligibleForBaseline)) {
    return 1;
  }

  const hashWeight = 0.35;
  const fsWeight = 0.15;
  const otherWeight = 1 - hashWeight - fsWeight;

  const hashScoreAfter = remainingDrift === 0 ? 1 : Math.max(0, 1 - remainingDrift / totalEntries);
  const fsScoreAfter = analyzed.some((a) => a.path.includes('Volume-10') && a.eligibleForBaseline) ? 1 : 0.5;
  const projected = hashScoreAfter * hashWeight + fsScoreAfter * fsWeight + otherWeight;

  return Math.round(Math.min(1, Math.max(integrityBefore, projected)) * 1000) / 1000;
}

module.exports = {
  analyzeDrifts,
  projectIntegrityAfterSync,
  mergeDivergenceSources
};
