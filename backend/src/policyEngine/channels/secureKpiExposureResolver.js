'use strict';

const dashboardAccessService = require('../../services/dashboardAccessService');
const phaseF = require('../config/phaseFFeatureFlags');
const { logPhaseF } = require('../observability/phaseFLogger');
const telemetry = require('../observability/governanceTelemetry');

const INFERENCE_BLOCK_PATTERNS = [
  /\boee\b/i,
  /\befici[eê]ncia\b/i,
  /\bprodutividade\b/i,
  /\bscrap\b/i,
  /\byield\b/i,
  /\bdowntime\b/i,
  /caiu\s+\d+\s*%/i,
  /subiu\s+\d+\s*%/i,
  /\bscope\s*[123]\b/i,
  /financial_indicators/i,
  /strategic_actions/i
];

const KPI_DOMAIN_HINTS = {
  oee: ['operations', 'maintenance'],
  efficiency: ['operations', 'quality'],
  scrap: ['quality'],
  emissions: ['environmental', 'sustainability'],
  esg: ['environmental', 'sustainability', 'executive'],
  payroll: ['hr', 'finance'],
  revenue: ['finance', 'executive']
};

function _kpiKey(kpi) {
  return String(kpi?.key || kpi?.id || kpi?.title || kpi?.label || '').toLowerCase();
}

function _axisAllowedForKpi(key, envelope) {
  if (!envelope || !envelope.domains || !envelope.domains.length) return true;
  const primary = envelope.primary_axis || envelope.domains[0];
  for (const [hint, axes] of Object.entries(KPI_DOMAIN_HINTS)) {
    if (key.includes(hint) && !axes.includes(primary)) return false;
  }
  return true;
}

/**
 * @param {object} user
 * @param {Array} kpis
 * @param {object} exposure — resolveContentExposure output
 * @param {{ shadowOnly?: boolean }} opts
 */
function resolveGovernedKpis(user, kpis, exposure = {}, opts = {}) {
  const list = Array.isArray(kpis) ? kpis : [];
  const active = phaseF.isKpiGovernanceEnabled(user) && !opts.shadowOnly;

  if (!active && !phaseF.isGovernanceShadowModeEnabled()) {
    return { kpis: dashboardAccessService.getAllowedKpis(user, list), governed: false };
  }

  const sections = exposure.sections || {};
  const envelope = exposure.cognitive_envelope || {};
  const denied = new Set(exposure.denied_modules || []);

  let rbacFiltered = dashboardAccessService.getAllowedKpis(user, list);
  const governed = [];
  const deniedKeys = [];

  for (const kpi of rbacFiltered) {
    const key = _kpiKey(kpi);
    let allow = true;
    let reason = null;

    if (sections.kpi_request === false) {
      allow = false;
      reason = 'section_kpi_request_denied';
    }
    if (allow && exposure.allow_kpis === false) {
      allow = false;
      reason = 'exposure_kpi_denied';
    }
    if (allow && ! _axisAllowedForKpi(key, envelope)) {
      allow = false;
      reason = 'cross_domain_kpi';
      logPhaseF('CHAT_CROSS_DOMAIN_BLOCKED', { kpi_key: key, axis: envelope.primary_axis });
      telemetry.recordDenial('cross_domain');
    }
    if (allow && INFERENCE_BLOCK_PATTERNS.some((p) => p.test(key))) {
      if (envelope.depth === 'operational' && envelope.strategic_access === false) {
        allow = false;
        reason = 'inference_sensitive_kpi';
        logPhaseF('KPI_INFERENCE_BLOCKED', { kpi_key: key, user_id: user?.id });
      }
    }

    if (allow) {
      governed.push(kpi);
    } else {
      deniedKeys.push({ key, reason });
      logPhaseF('KPI_DENIED', { kpi_key: key, reason, user_id: user?.id });
      telemetry.recordDenial('kpi');
      try {
        const bridge = require('../../explainability/governanceTraceBridge');
        bridge.recordGovernanceDecision({
          type: 'kpi_denial',
          user_id: user?.id,
          tenant_id: user?.company_id,
          domain: envelope?.primary_axis || exposure.functional_axis,
          hierarchy_level: user?.hierarchy_level,
          denied_entry: { key, reason },
          channel: 'dashboard_kpis',
          envelope_scope: envelope?.depth
        });
      } catch {
        /* optional */
      }
    }
  }

  logPhaseF('KPI_POLICY_APPLIED', {
    user_id: user?.id,
    legacy_count: rbacFiltered.length,
    governed_count: governed.length,
    denied_count: deniedKeys.length
  });

  try {
    const bridge = require('../../explainability/governanceTraceBridge');
    for (const d of deniedKeys) {
      bridge.recordGovernanceDecision({
        type: 'kpi_denial',
        user_id: user?.id,
        tenant_id: user?.company_id,
        domain: exposure.cognitive_envelope?.primary_axis,
        hierarchy_level: user?.hierarchy_level,
        denied_entry: d,
        envelope_scope: exposure.cognitive_envelope?.depth,
        channel: 'dashboard_kpis',
        decision: 'deny'
      });
    }
    if (deniedKeys.length === 0 && active) {
      bridge.recordGovernanceDecision({
        type: 'kpi_allow',
        user_id: user?.id,
        channel: 'dashboard_kpis',
        decision: 'allow',
        policy_layer: 'rbac'
      });
    }
  } catch {
    /* optional */
  }

  if (deniedKeys.length > 0) {
    logPhaseF('KPI_SCOPE_SANITIZED', { user_id: user?.id, denied: deniedKeys.slice(0, 20) });
    telemetry.recordSanitization('kpi');
  }

  const outputKpis = active ? governed : rbacFiltered;
  return {
    kpis: outputKpis,
    governed: active,
    legacy_kpis: rbacFiltered,
    governed_kpis: governed,
    denied_keys: deniedKeys
  };
}

function stripInferenceFromText(text, exposure) {
  if (!text || typeof text !== 'string') return text;
  if (!phaseF.isKpiGovernanceEnabled(user)) return text;
  if (exposure?.sections?.kpi_request !== false && exposure?.allow_kpis !== false) return text;

  let out = text;
  for (const pat of INFERENCE_BLOCK_PATTERNS) {
    if (pat.test(out)) {
      out = out.replace(pat, '[indicador restrito]');
      logPhaseF('KPI_INFERENCE_BLOCKED', { pattern: pat.source });
    }
  }
  return out;
}

module.exports = {
  resolveGovernedKpis,
  stripInferenceFromText,
  INFERENCE_BLOCK_PATTERNS
};
