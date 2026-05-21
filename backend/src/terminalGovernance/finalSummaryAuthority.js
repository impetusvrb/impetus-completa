'use strict';

/**
 * Isola domínio ANTES da composição — pool filtrado para downstream.
 */
function buildNarrativePool(input = {}, ctx = {}) {
  const domain = ctx.domain_axis || ctx.canonical_identity?.domain_axis || 'unknown';
  const pool = {
    domain_axis: domain,
    hierarchy_tier: ctx.hierarchy_tier,
    facts: Array.isArray(input.facts) ? input.facts.slice() : [],
    alerts: Array.isArray(input.alerts) ? input.alerts.slice() : [],
    kpis: Array.isArray(input.kpis) ? input.kpis.slice() : [],
    allowed_topics: _topicsForDomain(domain),
    blocked_topics: _blockedTopicsForDomain(domain)
  };
  return pool;
}

function _topicsForDomain(domain) {
  const d = String(domain || '').toLowerCase();
  if (d.includes('qual')) return ['inspecao', 'ncr', 'capa', 'spc', 'fornecedor', 'qualidade'];
  if (d === 'hr' || d.includes('rh')) return ['rh', 'pessoas', 'treinamento', 'onboarding'];
  if (d.includes('safety') || d.includes('sst')) return ['sst', 'apr', 'epi', 'incidente'];
  if (d.includes('environment') || d.includes('ambient')) return ['emissao', 'residuo', 'ambiental'];
  return ['operacional'];
}

function _blockedTopicsForDomain(domain) {
  const d = String(domain || '').toLowerCase();
  if (d.includes('qual')) return ['sst', 'apr', 'loto', 'faturamento', 'lucro', 'oee global'];
  if (d === 'hr' || d.includes('rh')) return ['sst', 'qualidade spc', 'emissao', 'faturamento'];
  if (d.includes('safety')) return ['faturamento', 'rh folha', 'spc qualidade'];
  return [];
}

function filterNarrativePool(pool = {}) {
  const blocked = pool.blocked_topics || [];
  const filterText = (t) => {
    const s = String(t || '').toLowerCase();
    return !blocked.some((b) => s.includes(b));
  };
  return {
    ...pool,
    facts: (pool.facts || []).filter(filterText),
    alerts: (pool.alerts || []).filter(filterText),
    pre_composition_filtered: true
  };
}

function applySummaryDomainIsolationBeforeCompose(summaryPayload = {}, ctx = {}) {
  const text = String(summaryPayload.summary || summaryPayload.text || '');
  const pool = buildNarrativePool(
    {
      facts: summaryPayload.facts || (text ? [text] : []),
      alerts: summaryPayload.alerts || [],
      kpis: ctx.kpis || []
    },
    ctx
  );
  const filtered = filterNarrativePool(pool);
  const crossHints = [];
  for (const b of pool.blocked_topics) {
    if (text.toLowerCase().includes(b)) crossHints.push(`blocked_topic_in_text:${b}`);
  }
  return {
    narrative_pool: filtered,
    cross_domain_hints: crossHints,
    leakage_detected: crossHints.length > 0,
    compose_allowed: true,
    rewrite_applied: false,
    semantic_truth_preserved: true
  };
}

function lockSummaryAfterTerminal(summaryPayload = {}, isolation = {}) {
  return {
    ...summaryPayload,
    _terminal_narrative_pool: isolation.narrative_pool,
    _terminal_isolation: isolation,
    terminal_summary_locked: true
  };
}

module.exports = {
  buildNarrativePool,
  filterNarrativePool,
  applySummaryDomainIsolationBeforeCompose,
  lockSummaryAfterTerminal
};
