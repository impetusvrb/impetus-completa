'use strict';

/**
 * CERT-EVENT-RETENTION-01 — Classificação de eventos por categoria de backbone.
 * Mapeia domain/event_name → categoria para políticas de retenção.
 */

const CATEGORIES = Object.freeze({
  OPERATIONAL_TELEMETRY: 'operational_telemetry',
  OPERATIONAL_INDUSTRIAL: 'operational_industrial',
  HUMAN_PULSE: 'human_pulse',
  COGNITIVE: 'cognitive',
  AUDIT_COMPLIANCE: 'audit_compliance',
  WORKFLOW_OUTBOX: 'workflow_outbox'
});

const DOMAIN_CATEGORY_MAP = Object.freeze({
  telemetry: CATEGORIES.OPERATIONAL_TELEMETRY,
  environment: CATEGORIES.OPERATIONAL_TELEMETRY,
  quality: CATEGORIES.OPERATIONAL_INDUSTRIAL,
  safety: CATEGORIES.OPERATIONAL_INDUSTRIAL,
  logistics: CATEGORIES.OPERATIONAL_INDUSTRIAL,
  maintenance: CATEGORIES.OPERATIONAL_INDUSTRIAL,
  tpm: CATEGORIES.OPERATIONAL_INDUSTRIAL,
  mes: CATEGORIES.OPERATIONAL_INDUSTRIAL,
  erp: CATEGORIES.OPERATIONAL_INDUSTRIAL,
  pulse: CATEGORIES.HUMAN_PULSE,
  hr: CATEGORIES.HUMAN_PULSE,
  human: CATEGORIES.HUMAN_PULSE,
  proacao: CATEGORIES.HUMAN_PULSE,
  cognitive: CATEGORIES.COGNITIVE,
  ai: CATEGORIES.COGNITIVE,
  anam: CATEGORIES.COGNITIVE,
  controller: CATEGORIES.COGNITIVE,
  insights: CATEGORIES.COGNITIVE,
  governance: CATEGORIES.AUDIT_COMPLIANCE,
  audit: CATEGORIES.AUDIT_COMPLIANCE,
  lgpd: CATEGORIES.AUDIT_COMPLIANCE,
  compliance: CATEGORIES.AUDIT_COMPLIANCE,
  workflow: CATEGORIES.WORKFLOW_OUTBOX,
  outbox: CATEGORIES.WORKFLOW_OUTBOX,
  aioi: CATEGORIES.OPERATIONAL_INDUSTRIAL
});

const EVENT_PREFIX_CATEGORY = Object.freeze([
  { prefix: 'environment.telemetry', category: CATEGORIES.OPERATIONAL_TELEMETRY },
  { prefix: 'quality.', category: CATEGORIES.OPERATIONAL_INDUSTRIAL },
  { prefix: 'safety.', category: CATEGORIES.OPERATIONAL_INDUSTRIAL },
  { prefix: 'pulse.', category: CATEGORIES.HUMAN_PULSE },
  { prefix: 'hr.', category: CATEGORIES.HUMAN_PULSE },
  { prefix: 'cognitive.', category: CATEGORIES.COGNITIVE },
  { prefix: 'anam.', category: CATEGORIES.COGNITIVE },
  { prefix: 'audit.', category: CATEGORIES.AUDIT_COMPLIANCE },
  { prefix: 'governance.', category: CATEGORIES.AUDIT_COMPLIANCE }
]);

/**
 * @param {{ domain?: string, event_name?: string, source_table?: string }} evt
 * @returns {string}
 */
function classifyEvent(evt = {}) {
  const domain = String(evt.domain || '').trim().toLowerCase();
  const eventName = String(evt.event_name || '').trim().toLowerCase();
  const sourceTable = String(evt.source_table || '').trim().toLowerCase();

  if (sourceTable === 'industrial_event_outbox' || sourceTable === 'industrial_event_archive') {
    return CATEGORIES.WORKFLOW_OUTBOX;
  }

  for (const rule of EVENT_PREFIX_CATEGORY) {
    if (eventName.startsWith(rule.prefix)) return rule.category;
  }

  if (DOMAIN_CATEGORY_MAP[domain]) return DOMAIN_CATEGORY_MAP[domain];

  if (/telemetry|sensor|plc|modbus|opcua/.test(eventName)) {
    return CATEGORIES.OPERATIONAL_TELEMETRY;
  }
  if (/audit|governance|lgpd|compliance/.test(eventName)) {
    return CATEGORIES.AUDIT_COMPLIANCE;
  }
  if (/pulse|hr|human|training|recognition/.test(eventName)) {
    return CATEGORIES.HUMAN_PULSE;
  }
  if (/cognitive|anam|insight|controller|conversation/.test(eventName)) {
    return CATEGORIES.COGNITIVE;
  }

  return CATEGORIES.OPERATIONAL_INDUSTRIAL;
}

function getCategoryCatalog() {
  return {
    categories: Object.values(CATEGORIES),
    domain_map: { ...DOMAIN_CATEGORY_MAP },
    prefix_rules: EVENT_PREFIX_CATEGORY.map((r) => ({ ...r }))
  };
}

module.exports = {
  CATEGORIES,
  DOMAIN_CATEGORY_MAP,
  classifyEvent,
  getCategoryCatalog
};
