'use strict';

/**
 * Agregação em memória de taxas de influência (sem BD) — para /unified-health apenas.
 */

const MAX = Math.min(
  600,
  Math.max(80, parseInt(process.env.UNIFIED_INFLUENCE_SUMMARY_BUFFER || '400', 10))
);

/** @type {Map<string, Array<{ high_risk: boolean, priority_override: boolean }>>} */
const buffers = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function getBuf(companyId) {
  const k = cidKey(companyId);
  if (!buffers.has(k)) buffers.set(k, []);
  return buffers.get(k);
}

/**
 * @param {string|null|undefined} companyId
 * @param {object|null} systemInfluence — meta.system_influence
 */
function recordInfluenceSample(companyId, systemInfluence) {
  const si = systemInfluence && typeof systemInfluence === 'object' ? systemInfluence : null;
  if (!si) return;

  const high_risk = String(si.risk_level || '').toLowerCase() === 'high';
  const priority_override = si.priority_override === true;

  const buf = getBuf(companyId);
  buf.push({ high_risk, priority_override });
  while (buf.length > MAX) buf.shift();
}

/**
 * @param {string|null|undefined} companyId
 * @returns {{ high_risk_rate: number, priority_override_rate: number, samples: number }}
 */
function getInfluenceSummary(companyId) {
  const buf = getBuf(companyId);
  const n = buf.length;
  if (!n) {
    return { high_risk_rate: 0, priority_override_rate: 0, samples: 0 };
  }
  let hr = 0;
  let po = 0;
  for (const r of buf) {
    if (r.high_risk) hr += 1;
    if (r.priority_override) po += 1;
  }
  return {
    high_risk_rate: Math.round((hr / n) * 1000) / 1000,
    priority_override_rate: Math.round((po / n) * 1000) / 1000,
    samples: n
  };
}

module.exports = {
  recordInfluenceSample,
  getInfluenceSummary,
  __test: { buffers, MAX, cidKey }
};
