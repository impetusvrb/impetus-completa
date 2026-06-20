'use strict';

/**
 * AIOI-P0.9 — Criticality Engine (facade)
 *
 * Implementação canónica consolidada em aioiClassificationEngine.js
 * conforme AIOI_ANTI_DUPLICATION_POLICY.md — este módulo expõe
 * a superfície P0-9 sem duplicar lógica determinística.
 */

const classification = require('./aioiClassificationEngine');

module.exports = {
  LAYER: 'AIOI_CRITICALITY_ENGINE',
  resolveCriticity: classification.resolveCriticity,
  CATEGORY_TO_CRITICITY: classification.CATEGORY_TO_CRITICITY,
};
