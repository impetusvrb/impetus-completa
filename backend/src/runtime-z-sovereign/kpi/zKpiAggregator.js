'use strict';

const DOMAIN_MAP = {
  quality: ['quality', 'qualidade', 'nc', 'capa', 'spc'],
  safety: ['safety', 'sst', 'seguranca', 'incidentes', 'epi'],
  hr: ['hr', 'rh', 'pessoas', 'turnover', 'absenteismo'],
  environmental: ['environmental', 'ambiental', 'emissao', 'esg'],
  production: ['production', 'producao', 'oee', 'turno'],
  maintenance: ['maintenance', 'manutencao', 'mttr', 'mtbf'],
  executive: ['executive', 'executivo', 'estrategico', 'roi']
};

function _detectDomain(kpi) {
  const haystack = `${kpi.key || ''} ${kpi.title || ''} ${kpi.category || ''}`.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_MAP)) {
    if (keywords.some((kw) => haystack.includes(kw))) return domain;
  }
  return kpi.domain || 'generic';
}

function aggregate(kpis = [], _ctx = {}) {
  if (!Array.isArray(kpis) || !kpis.length) {
    return { by_domain: {}, total: 0, domains_covered: [] };
  }

  const byDomain = {};
  for (const k of kpis) {
    const d = _detectDomain(k);
    byDomain[d] = byDomain[d] || { count: 0, items: [] };
    byDomain[d].count += 1;
    byDomain[d].items.push(k.key || k.title || k.id || 'kpi');
  }

  return {
    by_domain: byDomain,
    total: kpis.length,
    domains_covered: Object.keys(byDomain)
  };
}

module.exports = { aggregate };
