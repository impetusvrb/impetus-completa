'use strict';

const { getCanonicalDenySet } = require('../canonicalModuleGovernance/canonicalModuleMatrix');
const { normalizeModuleId } = require('../canonicalModuleGovernance/moduleAliasRegistry');

const PROFILE_RULES = Object.freeze({
  hr: {
    domain_axis: 'hr',
    must_not_modules: ['safety_intelligence', 'environment_intelligence', 'esg', 'emissions'],
    channels: ['menu', 'dashboard', 'kpi', 'summary', 'cockpit']
  },
  quality: {
    domain_axis: 'quality',
    must_not_modules: ['safety_intelligence', 'environment_intelligence', 'esg'],
    channels: ['menu', 'dashboard', 'kpi', 'summary', 'cockpit']
  },
  operator: {
    domain_axis: 'operations',
    must_not_modules: ['esg', 'executive_esg', 'anomaly_detection'],
    hierarchy_tier: 'operational',
    channels: ['menu', 'dashboard', 'kpi']
  },
  executive: {
    domain_axis: 'executive',
    must_not_modules: ['centro_operacoes', 'raw_operational_cockpit'],
    hierarchy_tier: 'executive',
    channels: ['menu', 'dashboard', 'cockpit']
  },
  safety: {
    domain_axis: 'safety',
    must_not_modules: ['hr_intelligence', 'people_analytics'],
    channels: ['menu', 'dashboard', 'kpi', 'summary']
  }
});

function _leakedModules(modules = [], mustNot = []) {
  const set = new Set(mustNot.map(normalizeModuleId));
  return modules.filter((m) => set.has(normalizeModuleId(m)));
}

function _checkChannel(profileKey, payload = {}, rule = {}) {
  const modules = payload.visible_modules || payload.sidebar_governance_runtime?.final_visible_modules || [];
  const denied = payload.sidebar_governance_runtime?.denied_publications || [];
  const domainDeny = [...getCanonicalDenySet(rule.domain_axis)];
  const leaked = _leakedModules(modules, [...rule.must_not_modules, ...domainDeny]);
  const deniedOk = rule.must_not_modules.every((m) => denied.includes(m) || !modules.includes(m));

  const kpiText = (payload.kpis || [])
    .map((k) => String(k.label || k.id || ''))
    .join(' ')
    .toLowerCase();
  const summaryText = String(payload.summary || payload.smart_summary || '').toLowerCase();
  const narrativeBleed =
    profileKey === 'quality' && /sst|apr|loto/.test(summaryText) ||
    profileKey === 'hr' && /sst|ambiental/.test(summaryText) ||
    profileKey === 'safety' && /folha de pagamento|rh intelligence/.test(summaryText);

  return {
    profile: profileKey,
    domain_axis: rule.domain_axis,
    menu_valid: leaked.length === 0,
    leaked_modules: leaked,
    denied_publications_ok: deniedOk,
    kpi_cross_domain: profileKey === 'quality' && /faturamento|lucro/.test(kpiText),
    summary_cross_domain: narrativeBleed,
    cockpit_bleed: !!(payload.cockpit_consistency && payload.cockpit_consistency.cockpit_consistent === false),
    telemetry_ok: !modules.includes('telemetria_sst') || profileKey === 'safety',
    contextual_ia_ok: !(payload.contextual_modules || []).some((c) => {
      const id = typeof c === 'string' ? c : c.module_id;
      return _leakedModules([id], rule.must_not_modules).length > 0;
    })
  };
}

function validateDomainIsolation(payload = {}, ctx = {}) {
  const profile = ctx.profile || ctx.domain_profile || 'quality';
  const rule = PROFILE_RULES[profile] || PROFILE_RULES.quality;
  const channelResult = _checkChannel(profile, payload, rule);
  const allProfiles = ctx.validate_all_profiles
    ? Object.keys(PROFILE_RULES).map((k) => _checkChannel(k, payload, PROFILE_RULES[k]))
    : [channelResult];

  const violations = allProfiles.filter((p) => !p.menu_valid || p.summary_cross_domain || p.kpi_cross_domain);

  return {
    domain_isolation_valid: violations.length === 0,
    profile_checked: profile,
    channel_results: allProfiles,
    violations,
    highest_risk: violations.map((v) => v.profile)
  };
}

module.exports = { validateDomainIsolation, PROFILE_RULES };
