'use strict';

const GENERIC_KPI_PATTERN =
  /operational_insights|department_interactions|recent_interactions|insights\s*(priorit|operacion)|intera[çc][õo]es|propostas\s*em\s*andamento|efici[eê]ncia|uptime|produ[çc][aã]o\s*total|crescimento\s*de\s*atividade/i;

function isGenericKpi(kpi) {
  const s = `${kpi?.id || ''} ${kpi?.key || ''} ${kpi?.title || kpi?.label || ''}`;
  return GENERIC_KPI_PATTERN.test(s);
}

function kpiRow(id, title, value, color, route, icon) {
  return {
    id,
    key: id,
    title,
    label: title,
    value,
    color: color || 'teal',
    route: route || '/app/quality',
    icon: icon || 'alert',
    icon_key: icon || 'alert',
    growth: null,
    domain: 'quality',
    specialized: true,
    source: 'z21_quality_kpi_adapter',
    assistive_only: true
  };
}

/**
 * Constrói KPIs quality-native a partir de bridge bindings + sinais tenant.
 */
function buildQualitySpecializedKpis(bindings = [], signalBundle = {}, opts = {}) {
  const max = opts.max_kpis ?? 6;
  const kpis = [];
  const byId = new Map(bindings.map((b) => [b.block_id, b]));

  const nc = byId.get('quality.nc_center');
  if (nc?.engine_ok) {
    kpis.push(
      kpiRow(
        'quality_open_nc',
        'NC abertas',
        nc.metrics?.open_nc ?? 0,
        'red',
        '/app/proacao',
        'alert'
      )
    );
  }

  const capa = byId.get('quality.capa_engine');
  if (capa?.engine_ok) {
    kpis.push(
      kpiRow(
        'quality_capa_pending',
        'CAPA pendentes',
        capa.metrics?.capa_pending ?? 0,
        'orange',
        '/app/proacao',
        'target'
      )
    );
  }

  const spc = byId.get('quality.spc_monitor');
  if (spc?.engine_ok && spc.metrics?.drift_severity) {
    const conf = Math.round((spc.metrics.drift_confidence || 0) * 100);
    kpis.push(
      kpiRow(
        'quality_spc_drift',
        'Monitor SPC / drift',
        `${spc.metrics.drift_severity} (${conf}%)`,
        spc.metrics.drift_severity === 'high' ? 'red' : 'amber',
        '/app/quality',
        'activity'
      )
    );
  }

  const rec = byId.get('quality.recurrence_analysis');
  if (rec?.engine_ok && rec.metrics?.recurrence_severity) {
    kpis.push(
      kpiRow(
        'quality_recurrence',
        'Reincidência NC',
        rec.metrics.dominant_count ?? rec.metrics.dominant_key ?? '—',
        'purple',
        '/app/proacao',
        'alert'
      )
    );
  }

  const heat = byId.get('quality.nonconformity_heatmap');
  if (heat?.engine_ok && heat.heatmap?.length) {
    const top = heat.heatmap[0];
    kpis.push(
      kpiRow(
        'quality_nc_heatmap',
        'NC por setor (pico)',
        `${top.sector}: ${top.count}`,
        'blue',
        '/app/quality',
        'map'
      )
    );
  }

  const audit = byId.get('quality.audit_governance');
  if (audit?.engine_ok) {
    kpis.push(
      kpiRow(
        'quality_compliance',
        'Conformidade (proxy)',
        audit.metrics?.compliance_proxy_score ?? '—',
        'green',
        '/app/quality',
        'target'
      )
    );
  }

  const stab = byId.get('quality.process_stability');
  if (stab?.engine_ok && stab.metrics?.deterioration_score != null) {
    kpis.push(
      kpiRow(
        'quality_process_stability',
        'Estabilidade processo',
        Number(stab.metrics.deterioration_score).toFixed(2),
        'teal',
        '/app/quality',
        'activity'
      )
    );
  }

  return kpis.slice(0, max);
}

function mergeKpisWithLegacy(legacyKpis = [], specializedKpis = [], opts = {}) {
  const legacy = Array.isArray(legacyKpis) ? [...legacyKpis] : [];
  const specialized = Array.isArray(specializedKpis) ? specializedKpis : [];
  const demoteGeneric = opts.demote_generic !== false;

  const filteredLegacy = demoteGeneric
    ? legacy.filter((k) => !isGenericKpi(k))
    : legacy;

  const merged = [...specialized, ...filteredLegacy];
  const maxTotal = opts.max_total ?? 10;
  const genericRemoved = legacy.length - filteredLegacy.length;

  return {
    kpis: merged.slice(0, maxTotal),
    kpis_legacy: legacy,
    kpis_specialized: specialized,
    genericity_reduction: legacy.length
      ? Math.round((genericRemoved / legacy.length) * 1000) / 1000
      : 0,
    generic_removed_count: genericRemoved,
    specialized_count: specialized.length
  };
}

module.exports = {
  GENERIC_KPI_PATTERN,
  isGenericKpi,
  buildQualitySpecializedKpis,
  mergeKpisWithLegacy
};
