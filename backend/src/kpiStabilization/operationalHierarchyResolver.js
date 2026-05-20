'use strict';

const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');
const { normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

/** Pares de domínio que não devem misturar-se em KPIs do mesmo painel */
const DOMAIN_SEPARATION = [
  ['executive', 'operator'],
  ['supervisor', 'executive'],
  ['safety', 'environmental'],
  ['environmental', 'quality'],
  ['financial', 'operations'],
  ['hr', 'operations']
];

function resolveOperationalHierarchy(user, ctx = {}) {
  const band = inferHierarchyBand(user, ctx);
  const axis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  return {
    hierarchy_band: band,
    operational_axis: axis,
    governance_level: ['executive', 'director'].includes(band) ? 'strategic' : 'operational'
  };
}

function checkDomainSeparation(kpis) {
  const domains = new Set(kpis.map((k) => require('../kpiRollout/kpiDomainRegistry').inferKpiDomain(k)));
  const violations = [];
  for (const [a, b] of DOMAIN_SEPARATION) {
    if (domains.has(a) && domains.has(b)) {
      violations.push({ type: 'domain_separation_violation', domains: [a, b] });
    }
  }
  return violations;
}

module.exports = { resolveOperationalHierarchy, checkDomainSeparation, DOMAIN_SEPARATION };
