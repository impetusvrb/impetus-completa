'use strict';

const DOMAIN_KEYWORDS = {
  safety: ['acidente', 'epi', 'nr-', 'risco', 'incidente', 'permit'],
  quality: ['nc', 'capa', 'spc', 'qualidade', 'audit'],
  environmental: ['emissao', 'residuo', 'agua', 'ambiental', 'esg'],
  production: ['producao', 'oee', 'parada', 'turno', 'setup'],
  maintenance: ['mttr', 'mtbf', 'manutencao', 'preventiva'],
  hr: ['turnover', 'treinamento', 'pessoas', 'absent']
};

function _normalize(t = '') {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function inferImpact(text = '', ctx = {}) {
  const t = _normalize(text);
  const domains = [];
  for (const [d, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) domains.push(d);
  }

  const breadth = domains.length;
  const operational_load = ctx?.operational?.open_tasks || 0;
  const impact_score = Number(
    Math.min(1, breadth * 0.25 + Math.min(operational_load / 10, 0.25) + (ctx?.operational?.critical_incidents ? 0.25 : 0) + 0.25)
      .toFixed(3)
  );

  return {
    impact_domains: domains,
    breadth,
    impact_score,
    organizational_impact: breadth >= 2 ? 'multi_domain' : breadth === 1 ? 'domain_specific' : 'narrow'
  };
}

module.exports = { inferImpact };
