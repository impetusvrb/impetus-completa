'use strict';

const EXEC_KPI = /faturamento|lucro|ebitda|margem|custo\s*industrial|oee\s*estrat/i;

function validateEnrichGovernance(enriched = {}, original = {}, eligibility = {}) {
  const errors = [];
  const kpis = enriched.kpis || [];

  for (const k of kpis) {
    const label = String(k.label || k.title || '');
    if (EXEC_KPI.test(label) && eligibility.governance_locked) {
      errors.push({ kpi: label, reason: 'executive_kpi_after_enrich_while_locked' });
    }
  }

  if (enriched.visible_modules && original.visible_modules) {
    const orig = new Set(original.visible_modules);
    const removed = original.visible_modules.filter((m) => !enriched.visible_modules.includes(m));
    if (removed.length && !eligibility.allow_module_removal) {
      errors.push({ reason: 'modules_removed_during_enrich', removed });
    }
    if (!orig.size && enriched.visible_modules.length) {
      /* ok */
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    terminal_safe: eligibility.terminal_safe !== false,
    governance_locked: eligibility.governance_locked === true
  };
}

module.exports = { validateEnrichGovernance };
