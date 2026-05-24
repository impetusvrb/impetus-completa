'use strict';

const DOMAIN_FLAG_MAP = Object.freeze({
  quality: {
    native: 'IMPETUS_QUALITY_NATIVE_COCKPIT',
    runtime: 'IMPETUS_QUALITY_COGNITIVE_RUNTIME',
    render: 'IMPETUS_QUALITY_RENDER_PROMOTION'
  },
  safety: {
    native: 'IMPETUS_SST_NATIVE_COCKPIT',
    runtime: 'IMPETUS_SAFETY_COGNITIVE_RUNTIME',
    render: 'IMPETUS_SAFETY_RENDER_PROMOTION'
  },
  hr: {
    native: 'IMPETUS_HR_NATIVE_COCKPIT',
    runtime: 'IMPETUS_HR_COGNITIVE_RUNTIME',
    render: 'IMPETUS_HR_RENDER_PROMOTION'
  },
  production: {
    native: 'IMPETUS_PRODUCTION_NATIVE_COCKPIT',
    runtime: 'IMPETUS_PRODUCTION_COGNITIVE_RUNTIME',
    render: 'IMPETUS_PRODUCTION_RENDER_PROMOTION'
  },
  environmental: {
    native: 'IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT',
    runtime: 'IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME',
    render: 'IMPETUS_ENVIRONMENTAL_RENDER_PROMOTION'
  },
  maintenance: {
    native: 'IMPETUS_MAINTENANCE_NATIVE_COCKPIT',
    runtime: 'IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME',
    render: 'IMPETUS_MAINTENANCE_RENDER_PROMOTION'
  },
  executive: {
    native: 'IMPETUS_EXECUTIVE_NATIVE_COCKPIT',
    runtime: 'IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME',
    render: 'IMPETUS_EXECUTIVE_RENDER_PROMOTION'
  }
});

const RUNTIME_PAYLOAD_KEY = Object.freeze({
  quality: ['specialized_cockpit_runtime', 'quality_cognitive_runtime'],
  safety: ['sst_cognitive_runtime'],
  hr: ['hr_cognitive_runtime'],
  production: ['production_cognitive_runtime'],
  environmental: ['environmental_cognitive_runtime'],
  maintenance: ['maintenance_cognitive_runtime'],
  executive: ['executive_cognitive_runtime']
});

function _classifyEnv(v) {
  const s = String(v || 'off').toLowerCase();
  if (s === 'authoritative' || s === 'active' || s === 'on') return 'AUTHORITATIVE';
  if (s === 'controlled' || s === 'pilot') return 'CONTROLLED';
  if (s === 'enrich' || s === 'enrichment') return 'ENRICH';
  if (s === 'shadow') return 'SHADOW';
  return 'OFF';
}

function validateCockpitAuthority(payload = {}) {
  const domains = {};
  let authoritativeCount = 0;
  let controlledCount = 0;
  let shadowCount = 0;

  for (const [domain, flags] of Object.entries(DOMAIN_FLAG_MAP)) {
    const envRuntime = _classifyEnv(process.env[flags.runtime]);
    const envRender = _classifyEnv(process.env[flags.render]);
    const envNative = _classifyEnv(process.env[flags.native]);
    const keys = RUNTIME_PAYLOAD_KEY[domain] || [];
    const rt = keys.map((k) => payload[k]).find(Boolean);
    const consolidated = rt?.consolidation_applied === true;

    let authority_level = 'OFF';
    if (envRuntime === 'AUTHORITATIVE' || envNative === 'AUTHORITATIVE') authority_level = 'AUTHORITATIVE';
    else if (consolidated && (envNative === 'CONTROLLED' || envRender === 'CONTROLLED' || envRuntime === 'CONTROLLED')) {
      authority_level = 'CONTROLLED';
    } else if (envRuntime === 'ENRICH') authority_level = 'ENRICH';
    else if (envRuntime === 'SHADOW' || envNative === 'SHADOW') authority_level = 'SHADOW';
    else if (consolidated) authority_level = 'CONTROLLED';

    if (authority_level === 'AUTHORITATIVE') authoritativeCount++;
    if (authority_level === 'CONTROLLED') controlledCount++;
    if (authority_level === 'SHADOW') shadowCount++;

    domains[domain] = {
      authority_level,
      consolidation_applied: consolidated,
      cockpit_mode: rt?.cockpit_mode || null,
      env: { native: envNative, runtime: envRuntime, render: envRender }
    };
  }

  const closest_to_authoritative = Object.entries(domains)
    .filter(([, d]) => d.consolidation_applied)
    .sort((a, b) => {
      const score = (l) => (l === 'CONTROLLED' ? 3 : l === 'ENRICH' ? 2 : l === 'SHADOW' ? 1 : 0);
      return score(b[1].authority_level) - score(a[1].authority_level);
    })
    .map(([d]) => d)[0] || null;

  return {
    domains,
    cockpit_authority_ratio: Number((controlledCount / 7).toFixed(3)),
    shadow_ratio: Number((shadowCount / 7).toFixed(3)),
    closest_to_authoritative,
    authoritative_count: authoritativeCount
  };
}

module.exports = { validateCockpitAuthority, DOMAIN_FLAG_MAP };
