'use strict';

/**
 * GF-016 — Algoritmos puros Ishikawa (migrados de qualityRootCauseEngine.js).
 * Propriedade exclusiva do domínio ishikawa — sem import do runtime Quality.
 */

const ISHIKAWA_CATEGORY_KEYS = Object.freeze([
  'MAN',
  'MACHINE',
  'METHOD',
  'MATERIAL',
  'MEASUREMENT',
  'MOTHER_NATURE'
]);

const ISHIKAWA_CATEGORY_LABELS = Object.freeze({
  MAN: 'Man (Manpower)',
  MACHINE: 'Machine',
  METHOD: 'Method',
  MATERIAL: 'Material',
  MEASUREMENT: 'Measurement',
  MOTHER_NATURE: 'Mother Nature (Environment)'
});

function buildIshikawaTemplate() {
  return ISHIKAWA_CATEGORY_KEYS.reduce((acc, k) => {
    acc[k] = { label: ISHIKAWA_CATEGORY_LABELS[k], causes: [] };
    return acc;
  }, {});
}

function fiveWhysChain(answers = []) {
  const chain = answers.map((a, i) => ({
    step: i + 1,
    answer: String(a || '').slice(0, 500)
  }));
  return {
    chain,
    depth: chain.length,
    root_hypothesis: chain[chain.length - 1]?.answer || null
  };
}

module.exports = {
  ISHIKAWA_CATEGORY_KEYS,
  ISHIKAWA_CATEGORY_LABELS,
  buildIshikawaTemplate,
  fiveWhysChain
};
