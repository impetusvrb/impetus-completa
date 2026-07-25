import React, { useMemo } from 'react';
import { eventsByType, fmt, severityBreakdown } from '../../utils/socMetrics';
import { SocDonut, SocHBarList, SocLineArea } from './SocChartPrimitives';

const SEV_COLORS = {
  CRITICAL: '#ff4040',
  HIGH: '#ff8800',
  MEDIUM: '#b44dff',
  LOW: '#00d4ff',
};

const SEV_LABELS = {
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
};

export default function SocBottomStrip({ data }) {
  const baseline = data?.phase_b?.behavioral_baseline;
  const byType = useMemo(() => eventsByType(baseline), [baseline]);
  const hourly = data?.charts?.attacks_per_hour;
  const { buckets, total: sevTotal } = useMemo(
    () => severityBreakdown(data?.critical_events),
    [data?.critical_events]
  );

  const sevSegments = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((k) => ({
    key: k,
    label: SEV_LABELS[k],
    value: buckets[k],
    color: SEV_COLORS[k],
  }));

  return (
    <div className="soc-bottom-strip">
      <div className="soc-strip-panel">
        <h3 className="soc-panel-title">Eventos por Tipo</h3>
        <SocHBarList
          rows={byType}
          emptyLabel="Sem categorias de alerta nas últimas 24h."
        />
      </div>

      <div className="soc-strip-panel soc-strip-panel--wide">
        <h3 className="soc-panel-title">Linha do Tempo de Ameaças</h3>
        <SocLineArea
          series={hourly}
          emptyLabel="TELEMETRIA TEMPORAL INSUFICIENTE"
        />
        {hourly?.some((p) => p.count > 0) && (
          <p className="soc-strip-hint">
            Série: <code>charts.attacks_per_hour</code> — threat-watch, 24h UTC
          </p>
        )}
      </div>

      <div className="soc-strip-panel">
        <h3 className="soc-panel-title">Severidade dos Alertas</h3>
        <div className="soc-sev-body">
          <SocDonut
            segments={sevSegments}
            total={sevTotal}
            centerLabel="TOTAL"
            size={100}
            emptyLabel="Sem eventos críticos classificados."
          />
          <ul className="soc-decomp-legend soc-decomp-legend--compact">
            {sevSegments.filter((s) => s.value > 0).map((seg) => (
              <li key={seg.key}>
                <span className="soc-legend-dot" style={{ background: seg.color }} />
                <span className="soc-legend-name">{seg.label}</span>
                <span className="soc-legend-val">{fmt(seg.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="soc-strip-hint">Fonte: critical_events (severidade real)</p>
      </div>
    </div>
  );
}
