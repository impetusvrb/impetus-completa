'use strict';

function computeRpn(severity, occurrence, detection) {
  const s = Math.max(1, Math.min(10, Number(severity) || 1));
  const o = Math.max(1, Math.min(10, Number(occurrence) || 1));
  const d = Math.max(1, Math.min(10, Number(detection) || 1));
  return { severity: s, occurrence: o, detection: d, rpn: s * o * d };
}

function rankFmeaRows(rows = []) {
  return [...rows].map((r) => ({ ...r, ...computeRpn(r.severity, r.occurrence, r.detection) })).sort((a, b) => b.rpn - a.rpn);
}

module.exports = {
  computeRpn,
  rankFmeaRows
};
