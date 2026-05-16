'use strict';

function cellKey(severity, likelihood) {
  return `${Number(severity)}:${Number(likelihood)}`;
}

function classifyMatrixCell(sev, lik, matrix = {}) {
  const k = cellKey(sev, lik);
  return matrix[k] || { tier: Math.min(5, sev + lik - 1), label: 'review' };
}

module.exports = {
  cellKey,
  classifyMatrixCell
};
