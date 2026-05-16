'use strict';

/**
 * Comparação determinística com intervalo enviado pelo integrador (sem ML).
 * Único efeito: sinalizar observação / evento de catálogo; não executa workflows.
 */

function evaluateExpectedRange(value, expectedRange) {
  if (expectedRange == null || typeof expectedRange !== 'object') {
    return { breached: false };
  }
  const v = Number(value);
  if (!Number.isFinite(v)) return { breached: false, reason: 'value_not_finite' };

  const minRaw = expectedRange.min;
  const maxRaw = expectedRange.max;
  const hasMin = minRaw != null && String(minRaw).trim() !== '';
  const hasMax = maxRaw != null && String(maxRaw).trim() !== '';

  const min = hasMin ? Number(minRaw) : null;
  const max = hasMax ? Number(maxRaw) : null;

  if (hasMin && !Number.isFinite(min)) return { breached: false, reason: 'invalid_min' };
  if (hasMax && !Number.isFinite(max)) return { breached: false, reason: 'invalid_max' };

  let breached = false;
  if (hasMin && v < min) breached = true;
  if (hasMax && v > max) breached = true;

  return { breached, min: hasMin ? min : null, max: hasMax ? max : null };
}

module.exports = { evaluateExpectedRange };
