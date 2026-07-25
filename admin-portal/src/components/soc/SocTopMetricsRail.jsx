import React from 'react';
import { buildTopMetrics, fmt } from '../../utils/socMetrics';

const ICONS = {
  shield: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 2L4 5v6c0 5.25 3.4 10.15 8 11.35C16.6 21.15 20 16.25 20 11V5l-8-3zm0 2.2l6 2.25V11c0 4.2-2.75 8.15-6 9.2-3.25-1.05-6-5-6-9.2V6.45l6-2.25z" />
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M3 12h3l2-7 4 14 2-7h7v2H14l-2 7-4-14-2 7H3v-2z" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.93 9h-3.18a15.7 15.7 0 00-1.12-4.32A8.03 8.03 0 0119.93 11zM12 4c.95 1.6 1.72 3.52 2.12 5.58H9.88C10.28 7.52 11.05 5.6 12 4zM4.37 13h3.18c.24 1.55.68 3 1.28 4.32A8.03 8.03 0 014.37 13zm3.18-2H4.37a8.03 8.03 0 013.46-4.32c-.6 1.32-1.04 2.77-1.28 4.32zM12 20c-.95-1.6-1.72-3.52-2.12-5.58h4.24C13.72 16.48 12.95 18.4 12 20zm4.07-7c-.24-1.55-.68-3-1.28-4.32A8.03 8.03 0 0119.63 13h-3.18zm-1.77-4.32c.6 1.32 1.04 2.77 1.28 4.32h3.18a8.03 8.03 0 00-3.46-4.32c.24 1.32.68 2.77 1 4.32z" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 2L1 21h22L12 2zm0 4.5L19.5 19h-15L12 6.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
    </svg>
  ),
};

function ExecutiveKpi({ icon, label, value, suffix, context, accent, gap }) {
  return (
    <article className="soc-exec-kpi">
      <div className="soc-exec-kpi-icon" style={{ color: accent || 'var(--cyan)' }}>
        {icon}
      </div>
      <div className="soc-exec-kpi-body">
        <span className="soc-exec-kpi-label">{label}</span>
        <div className="soc-exec-kpi-value" style={{ color: accent || 'var(--text1)' }}>
          {gap ? '—' : fmt(value)}
          {!gap && suffix && <span className="soc-exec-kpi-suffix">{suffix}</span>}
        </div>
        {gap ? (
          <span className="soc-exec-kpi-meta soc-exec-kpi-gap">METRIC_DATA_GAP</span>
        ) : context ? (
          <span className="soc-exec-kpi-meta">{context}</span>
        ) : null}
      </div>
    </article>
  );
}

export default function SocTopMetricsRail({ data }) {
  const m = buildTopMetrics(data);

  return (
    <div className="soc-top-rail">
      <div className="soc-metrics-row">
        <ExecutiveKpi
          icon={ICONS.shield}
          label="Índice de Segurança"
          value={m.securityIndex.value}
          suffix={m.securityIndex.suffix}
          context={m.securityIndex.context}
          accent="#b44dff"
          gap={m.securityIndex.gap}
        />
        <ExecutiveKpi
          icon={ICONS.pulse}
          label="Eventos Ponderados"
          value={m.weightedEvents.value}
          context={m.weightedEvents.context}
          accent="var(--text1)"
          gap={m.weightedEvents.gap}
        />
        <ExecutiveKpi
          icon={ICONS.globe}
          label="Origens Ativas"
          value={m.activeOrigins.value}
          context={m.activeOrigins.context}
          accent="var(--cyan)"
          gap={m.activeOrigins.gap}
        />
        <ExecutiveKpi
          icon={ICONS.pin}
          label="Países Impactados"
          value={m.impactedCountries.value}
          context={m.impactedCountries.context}
          accent="var(--cyan)"
          gap={m.impactedCountries.gap}
        />
        <ExecutiveKpi
          icon={ICONS.alert}
          label="Alertas Críticos"
          value={m.criticalAlerts.value}
          context={m.criticalAlerts.context}
          accent="var(--red)"
          gap={m.criticalAlerts.gap}
        />
      </div>
    </div>
  );
}
