'use strict';

/**
 * Publicação de eventos governance.* no industrial event backbone (catálogo canónico).
 */

const ALLOWED = new Set([
  'governance.action.executed',
  'governance.action.rejected',
  'governance.action.rolled_back'
]);

function publishGovernanceActionEvent(eventName, { companyId, correlationId, payload = {} } = {}) {
  const name = String(eventName || '').trim().toLowerCase();
  if (!ALLOWED.has(name) || !companyId) return;

  try {
    const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
    const check = validateCatalogType(name, { strict: false });
    if (!check.ok) {
      console.warn('[GOVERNANCE_BACKBONE_SKIP]', JSON.stringify({ event_name: name, reason: check.reason }));
      return;
    }

    const backbone = require('../../eventPipeline/industrialEventBackbone');
    if (!backbone.publishIndustrialEventDeferred) return;

    backbone.publishIndustrialEventDeferred({
      event_name: name,
      company_id: companyId,
      correlation_id: correlationId || null,
      payload
    });
  } catch (err) {
    try {
      console.warn('[GOVERNANCE_BACKBONE_ERR]', JSON.stringify({ event_name: name, message: err?.message }));
    } catch (_e) {}
  }
}

module.exports = { publishGovernanceActionEvent, ALLOWED_EVENTS: ALLOWED };
