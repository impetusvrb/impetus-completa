'use strict';

const ISHIKAWA = Object.freeze(['method', 'machine', 'material', 'manpower', 'measurement', 'environment']);

function buildIshikawaTemplate() {
  return ISHIKAWA.reduce((acc, k) => {
    acc[k] = { causes: [] };
    return acc;
  }, {});
}

function fiveWhysChain(answers = []) {
  const chain = answers.map((a, i) => ({ step: i + 1, answer: String(a || '').slice(0, 500) }));
  return { chain, depth: chain.length, root_hypothesis: chain[chain.length - 1] || null };
}

module.exports = {
  ISHIKAWA,
  buildIshikawaTemplate,
  fiveWhysChain
};
