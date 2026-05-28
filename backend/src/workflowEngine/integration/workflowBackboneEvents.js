'use strict';

const ALLOWED = new Set([
  'governance.workflow.started',
  'governance.workflow.transitioned',
  'governance.workflow.completed',
  'governance.workflow.compensated',
  'governance.workflow.recovered'
]);

function publishWorkflowEvent(eventName, { companyId, correlationId, payload = {} } = {}) {
  const name = String(eventName || '').trim().toLowerCase();
  if (!ALLOWED.has(name) || !companyId) return;

  try {
    const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
    const check = validateCatalogType(name, { strict: false });
    if (!check.ok) {
      console.warn('[WORKFLOW_BACKBONE_SKIP]', JSON.stringify({ event_name: name, reason: check.reason }));
      return;
    }
    const backbone = require('../../eventPipeline/industrialEventBackbone');
    if (backbone.publishIndustrialEventDeferred) {
      backbone.publishIndustrialEventDeferred({
        event_name: name,
        company_id: companyId,
        correlation_id: correlationId,
        payload
      });
    }
  } catch (err) {
    console.warn('[WORKFLOW_BACKBONE_ERR]', JSON.stringify({ event_name: name, message: err?.message }));
  }
}

module.exports = { publishWorkflowEvent, ALLOWED_EVENTS: ALLOWED };
