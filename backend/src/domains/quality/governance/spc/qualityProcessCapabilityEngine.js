'use strict';

const { mean, stdSample } = require('./qualitySpcEngine');

/**
 * Cp/Cpk (curto prazo, assume dados individuais ou já agregados).
 * Pp/Ppk idem com sigma longo (aqui usa desvio amostral dos dados fornecidos).
 */
function capabilityIndices(samples, usl, lsl) {
  const x = samples.filter((v) => Number.isFinite(v));
  if (x.length < 2) return { error: 'insufficient_samples' };
  const m = mean(x);
  const sigmaLt = stdSample(x);
  if (usl == null || lsl == null || !Number.isFinite(usl) || !Number.isFinite(lsl)) {
    return { error: 'usl_lsl_required' };
  }
  const pp = (usl - lsl) / (6 * sigmaLt);
  const cpu = (usl - m) / (3 * sigmaLt);
  const cpl = (m - lsl) / (3 * sigmaLt);
  const ppk = Math.min(cpu, cpl);
  return {
    mean: m,
    sigma_long_term: sigmaLt,
    pp,
    ppk,
    cpu,
    cpl,
    cp: pp,
    cpk: ppk
  };
}

/** Cp/Cpk com σ_within passado (ex.: de Rbar/d2 do X-bar R) */
function capabilityFromWithin(m, sigmaWithin, usl, lsl) {
  if (!Number.isFinite(m) || !Number.isFinite(sigmaWithin) || sigmaWithin <= 0) {
    return { error: 'bad_params' };
  }
  if (usl == null || lsl == null) return { error: 'usl_lsl_required' };
  const cp = (usl - lsl) / (6 * sigmaWithin);
  const cpu = (usl - m) / (3 * sigmaWithin);
  const cpl = (m - lsl) / (3 * sigmaWithin);
  const cpk = Math.min(cpu, cpl);
  return { mean: m, sigma_within: sigmaWithin, cp, cpk, cpu, cpl };
}

module.exports = {
  capabilityIndices,
  capabilityFromWithin
};
