'use strict';

/**
 * SEC-10 — Security Mode Manager.
 * Estados lógicos apenas — nunca altera runtime automaticamente.
 */

const MODES = Object.freeze([
  'NORMAL',
  'MONITORING',
  'ELEVATED',
  'DEFENSE',
  'PROTECTED'
]);

function resolveModeFromThreatLevel(threatLevel) {
  switch (threatLevel) {
    case 'CRITICAL':
      return 'PROTECTED';
    case 'HIGH':
      return 'DEFENSE';
    case 'MEDIUM':
      return 'ELEVATED';
    case 'LOW':
      return 'MONITORING';
    default:
      return 'NORMAL';
  }
}

function describeMode(mode) {
  const descriptions = {
    NORMAL: 'Operação standard — sem ameaça activa detectada',
    MONITORING: 'Observação aumentada — actividade de baixo risco',
    ELEVATED: 'Ameaça moderada — recomendações activas',
    DEFENSE: 'Ameaça alta — pacotes operador e evidências prioritários',
    PROTECTED: 'Ameaça crítica — modo lógico máximo (sem acção automática)'
  };
  return descriptions[mode] || descriptions.NORMAL;
}

function canTransition(from, to) {
  if (!MODES.includes(from) || !MODES.includes(to)) return false;
  const order = MODES.indexOf(to) - MODES.indexOf(from);
  return Math.abs(order) <= 2 || to === 'NORMAL';
}

module.exports = {
  MODES,
  resolveModeFromThreatLevel,
  describeMode,
  canTransition
};
