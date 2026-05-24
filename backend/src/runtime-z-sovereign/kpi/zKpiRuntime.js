'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { aggregate } = require('./zKpiAggregator');
const { normalize } = require('./zKpiNormalizationRuntime');
const { fallbackKpis } = require('./zKpiFallbackRuntime');

let _kpiService = null;
let _composer = null;
let _hierFilter = null;

function _lazyKpi() {
  if (_kpiService) return _kpiService;
  try {
    _kpiService = require('../../services/dashboardKPIs');
  } catch (_) {
    _kpiService = null;
  }
  return _kpiService;
}

function _lazyComposer() {
  if (_composer) return _composer;
  try {
    _composer = require('../../services/dashboardComposerService');
  } catch (_) {
    _composer = null;
  }
  return _composer;
}

function _lazyHier() {
  if (_hierFilter) return _hierFilter;
  try {
    _hierFilter = require('../../services/hierarchicalDataFilter');
  } catch (_) {
    _hierFilter = null;
  }
  return _hierFilter;
}

/**
 * zKpiRuntime — internaliza dashboardKPIs.getDashboardKPIs e a
 * applyPersonalizationToKpis como sub-runtime soberano, garantindo:
 *
 *  - tenant isolation (já presente em getDashboardKPIs);
 *  - normalização cross-domain;
 *  - fallback estável (nunca devolve null);
 *  - score de qualidade do payload.
 */
async function resolveKpis(user = {}, ctx = {}) {
  if (!flags.isKpiRuntimeEnabled()) {
    return { kpis: [], runtime_skipped: true };
  }

  const kpiService = _lazyKpi();
  const composer = _lazyComposer();
  const hier = _lazyHier();

  let scope = ctx.hierarchy_scope || null;
  if (!scope && hier && typeof hier.resolveHierarchyScope === 'function') {
    try {
      scope = await hier.resolveHierarchyScope(user);
    } catch (_) {
      scope = null;
    }
  }

  let raw = [];
  if (kpiService && typeof kpiService.getDashboardKPIs === 'function') {
    try {
      raw = (await kpiService.getDashboardKPIs(user, scope)) || [];
    } catch (err) {
      raw = [];
    }
  }

  let personalized = raw;
  if (composer && typeof composer.applyPersonalizationToKpis === 'function') {
    try {
      personalized = composer.applyPersonalizationToKpis(raw, user) || raw;
    } catch (_) {
      personalized = raw;
    }
  }

  const normalized = normalize(personalized);
  const aggregated = aggregate(normalized, ctx);

  const usedFallback = !Array.isArray(normalized) || normalized.length === 0;
  const finalKpis = usedFallback ? fallbackKpis(user, ctx) : normalized;

  return {
    kpis: finalKpis,
    kpis_raw: raw,
    kpis_aggregated: aggregated,
    fallback_used: usedFallback,
    quality_score: Number(
      Math.max(0, Math.min(1, (finalKpis.length / 8) * (usedFallback ? 0.5 : 1))).toFixed(3)
    ),
    runtime: 'runtime_z',
    source: 'z_kpi_runtime',
    delegated_to: ['dashboardKPIs', 'dashboardComposerService'],
    auto_mutation: false
  };
}

module.exports = { resolveKpis };
