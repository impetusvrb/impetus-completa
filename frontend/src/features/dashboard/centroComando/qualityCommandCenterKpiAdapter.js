/**
 * INC-032 — Adapter único: KPIs Centro de Comando ↔ domínio Qualidade oficial.
 * Fonte canónica NC: quality_inspections (via nc-capa-summary, igual ao GovernanceHub).
 */

const EMPTY = '—';

export function isQualityCommandCenterProfile(meData = {}) {
  const profile = String(meData?.profile_code || '').toLowerCase();
  const area = String(meData?.functional_area || meData?.functional_axis || '').toLowerCase();
  return /quality|qualidade/.test(profile) || /quality|qualidade/.test(area);
}

function formatKpiValue(value) {
  if (value == null || value === '') return EMPTY;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value);
}

/**
 * Resolve métricas NC/CAPA alinhadas ao QualityGovernanceHub.
 * @param {object|null} ncrSummary — resposta /quality-intelligence/nc-capa-summary
 * @param {object|null} summary — /dashboard/summary
 */
export function resolveQualityNcMetrics(ncrSummary = null, summary = null) {
  const fromNcr = ncrSummary?.summary ?? ncrSummary ?? null;
  const fromSummary = summary?.quality_inspections ?? summary?.quality_nc ?? null;

  const inspectionsNc =
    fromNcr?.inspections_non_conforming ??
    fromSummary?.non_conforming ??
    fromSummary?.total ??
    null;

  const dataAvailable =
    fromNcr != null
      ? typeof inspectionsNc === 'number'
      : fromSummary?.data_available === true || typeof inspectionsNc === 'number';

  return {
    inspections_non_conforming: dataAvailable ? inspectionsNc : null,
    ncr_open: fromNcr?.ncr_open ?? null,
    capa_in_progress: fromNcr?.capa_in_progress ?? null,
    source: fromNcr ? 'quality_inspections+workflows' : 'quality_inspections',
    data_available: dataAvailable
  };
}

/**
 * @param {{ meData?: object, summary?: object, kpis?: object[], ncrSummary?: object }} input
 */
export function buildQualityCommandCenterKpiView(input = {}) {
  const { meData = {}, summary = null, kpis = [], ncrSummary = null } = input;
  if (!isQualityCommandCenterProfile(meData)) return null;

  const nc = resolveQualityNcMetrics(ncrSummary, summary);
  const openNcKpi = (kpis || []).find((k) => k?.id === 'open_nc' || k?.key === 'open_nc' || k?.id === 'quality_open_nc');

  const ncValue =
    nc.data_available && nc.inspections_non_conforming != null
      ? nc.inspections_non_conforming
      : openNcKpi?.data_available === true && openNcKpi?.value !== '—'
        ? openNcKpi.value
        : null;

  return {
    domain: 'quality',
    source: 'quality_inspections',
    nc: {
      value: ncValue,
      display: formatKpiValue(ncValue),
      label: 'NC abertas',
      unit: 'inspeções',
      sub: 'quality_inspections',
      unavailable: ncValue == null
    },
    capa: {
      value: nc.capa_in_progress,
      display: formatKpiValue(nc.capa_in_progress),
      unavailable: nc.capa_in_progress == null
    },
    heroCriticalTasks: {
      value: ncValue,
      display: formatKpiValue(ncValue),
      unit: 'NC',
      sub: 'quality_inspections',
      unavailable: ncValue == null
    },
    widgetFourthSlot: {
      value: ncValue,
      display: formatKpiValue(ncValue),
      label: 'NC inspeções',
      unavailable: ncValue == null
    },
    insights: summary?.ai_insights?.total ?? null,
    interactions: summary?.operational_interactions?.total ?? null,
    alertsCritical: summary?.alerts?.critical ?? null
  };
}

/**
 * Substitui campos dependentes de proposals quando perfil quality.
 */
export function applyQualityKpiReconciliation(baseView, qualityView) {
  if (!qualityView) return baseView;
  return {
    ...baseView,
    proposals: {
      total: qualityView.nc.value,
      display: qualityView.nc.display,
      source: 'quality_inspections',
      unavailable: qualityView.nc.unavailable
    },
    quality: qualityView
  };
}

export { EMPTY as QUALITY_KPI_EMPTY };
