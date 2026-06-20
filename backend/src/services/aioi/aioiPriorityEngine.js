'use strict';

/**
 * AIOI-P0.10 — Priority Engine (facade)
 *
 * Implementação canónica consolidada em aioiClassificationEngine.js
 * conforme AIOI_ANTI_DUPLICATION_POLICY.md — este módulo expõe
 * a superfície P0-10 sem duplicar lógica determinística.
 */

const classification = require('./aioiClassificationEngine');

module.exports = {
  LAYER: 'AIOI_PRIORITY_ENGINE',
  resolvePriorityBand: classification.resolvePriorityBand,
};
