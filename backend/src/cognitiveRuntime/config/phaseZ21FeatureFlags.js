'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (v === 'shadow' || v === 'enrich' || v === 'on') return v;
  return 'off';
}

module.exports = {
  specializedDeliveryMode: () => _mode('IMPETUS_SPECIALIZED_DELIVERY_ENRICH', 'off'),
  isSpecializedDeliveryEnrichActive: () => _mode('IMPETUS_SPECIALIZED_DELIVERY_ENRICH', 'off') === 'enrich',
  isSpecializedDeliveryShadowCompare: () =>
    _mode('IMPETUS_SPECIALIZED_DELIVERY_ENRICH', 'off') === 'shadow' ||
    _flag('IMPETUS_SPECIALIZED_DELIVERY_OBSERVABILITY', true),
  isKpiDomainAdapterEnabled: () =>
    _mode('IMPETUS_KPI_DOMAIN_ADAPTER', 'off') !== 'off' ||
    _mode('IMPETUS_SPECIALIZED_DELIVERY_ENRICH', 'off') === 'enrich',
  isSummaryEnrichmentEnabled: () =>
    _flag('IMPETUS_QUALITY_SUMMARY_ENRICH', true) &&
    (_mode('IMPETUS_SPECIALIZED_DELIVERY_ENRICH', 'off') === 'enrich' ||
      _flag('IMPETUS_QUALITY_SUMMARY_ENRICH_FORCE', false)),
  minBindingRatioForPromotion: () => {
    const v = Number(process.env.IMPETUS_Z21_MIN_BINDING_RATIO);
    return Number.isFinite(v) && v > 0 ? v : 0.5;
  },
  maxSpecializedKpis: () => {
    const v = Number(process.env.IMPETUS_Z21_MAX_SPECIALIZED_KPIS);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 8) : 6;
  },
  replaceLegacyCockpit: false,
  removeLegacyWidgets: false,
  autoRemediation: false,
  globalReplace: false
};
