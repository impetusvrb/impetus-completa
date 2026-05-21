'use strict';

const CROSS_DOMAIN_HINTS = Object.freeze({
  quality: [/sst/i, /apr/i, /loto/i, /ambiental/i, /rh intelligence/i],
  hr: [/sst/i, /apr/i, /spc qualidade/i, /emiss[aã]o/i],
  safety: [/folha de pagamento/i, /onboarding rh/i, /faturamento/i],
  executive: [/apr operacional/i, /ncr linha 3/i]
});

function validateSummaryGovernance(summaryPayload = {}, ctx = {}) {
  const domain = ctx.domain_axis || ctx.canonical_identity?.domain_axis || 'quality';
  const tier = ctx.hierarchy_tier || 'coordination';
  const text = String(summaryPayload.summary || summaryPayload.text || '');
  const facts = (summaryPayload.facts || []).map(String).join(' ');
  const combined = `${text} ${facts}`.toLowerCase();

  const profileKey = domain.includes('qual')
    ? 'quality'
    : domain === 'hr' || domain.includes('rh')
      ? 'hr'
      : domain.includes('safety') || domain.includes('sst')
        ? 'safety'
        : domain.includes('execut')
          ? 'executive'
          : 'quality';

  const hints = CROSS_DOMAIN_HINTS[profileKey] || [];
  const bleed = hints.filter((rx) => rx.test(combined)).map((rx) => rx.source);

  const genericFallback = /resumo gen[eé]rico|sem dados|n\/a/i.test(combined) && combined.length < 40;
  const staleReuse = summaryPayload._terminal_isolation?.rewrite_applied === false && bleed.length > 0;

  const cockpitAligned =
    !ctx.cockpit_kpis ||
    (summaryPayload.kpis || []).length <= (ctx.cockpit_kpis || []).length + 2;

  return {
    summary_cross_domain_detected: bleed.length > 0,
    narrative_bleed: bleed,
    cross_domain_composition: bleed.length > 0 && text.length > 80,
    genericity_fallback: genericFallback,
    stale_narrative_reuse: staleReuse,
    hierarchy_respected: tier !== 'executive' || !/ncr operacional bruto/i.test(combined),
    cockpit_coherent: cockpitAligned,
    kpi_coherent: !(/faturamento|ebitda/i.test(combined) && profileKey !== 'executive'),
    domain_axis: domain,
    pre_compose_isolation: summaryPayload._terminal_isolation?.narrative_pool?.pre_composition_filtered === true
  };
}

module.exports = { validateSummaryGovernance, CROSS_DOMAIN_HINTS };
