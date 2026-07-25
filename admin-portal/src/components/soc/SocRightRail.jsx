import React, { useMemo } from 'react';
import {
  buildGlobalIndexDecomposition,
  buildIndexDecomposition,
  fmt,
  topOriginsFromMap,
} from '../../utils/socMetrics';
import { SocDonut } from './SocChartPrimitives';

const DECOMP_COLORS = {
  nginx: '#ff4040',
  blocked: '#ff8800',
  alerts: '#00d4ff',
};

export default function SocRightRail({
  data,
  selectedCode,
  selectedLabel,
  onSelectCountry,
  onOpenReport,
}) {
  const points = data?.phase_b?.world_map?.points || [];
  const topOrigins = useMemo(() => topOriginsFromMap(points, 7), [points]);
  const unknownPoint = useMemo(() => points.find((p) => p.country_code === '??'), [points]);

  const decomp = useMemo(() => {
    if (selectedCode) {
      return buildIndexDecomposition(
        selectedCode,
        data?.attack_origins,
        data?.blocked_ips,
        data?.recent_alerts
      );
    }
    return buildGlobalIndexDecomposition(data);
  }, [selectedCode, data]);

  const decompSegments = [
    { key: 'nginx', label: 'Nginx Suspeitas', value: decomp.nginx_hits_x1, color: DECOMP_COLORS.nginx },
    { key: 'blocked', label: 'IPs Bloqueados', value: decomp.blocked_ips_x2, color: DECOMP_COLORS.blocked },
    { key: 'alerts', label: 'Alerts Threat', value: decomp.threat_alerts_x1, color: DECOMP_COLORS.alerts },
  ];

  const decompTitle = selectedCode
    ? `Decomposição de Índice — ${selectedLabel || selectedCode}`
    : 'Decomposição de Índice — Global';

  return (
    <aside className="soc-right-rail">
      <div className="soc-rail-panel">
        <h3 className="soc-panel-title">{decompTitle}</h3>
        <div className="soc-decomp-body">
          <SocDonut
            segments={decompSegments}
            total={decomp.total}
            centerLabel="TOTAL"
            size={96}
            emptyLabel="Sem componentes indexados."
          />
          <ul className="soc-decomp-legend">
            {decompSegments.map((seg) => (
              <li key={seg.key}>
                <span className="soc-legend-dot" style={{ background: seg.color }} />
                <span className="soc-legend-name">{seg.label}</span>
                <span className="soc-legend-val">{fmt(seg.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="soc-rail-panel soc-rail-grow">
        <h3 className="soc-panel-title">Top Origens</h3>
        {topOrigins.length === 0 ? (
          <p className="soc-empty">Sem origens geolocalizadas.</p>
        ) : (
          <ol className="soc-top-origins">
            {topOrigins.map((o) => {
              const active = selectedCode === o.country_code;
              return (
                <li key={o.country_code}>
                  <button
                    type="button"
                    className={`soc-origin-row${active ? ' soc-origin-row--active' : ''}`}
                    onClick={() => onSelectCountry?.({ key: o.country_code, label: o.country || o.country_code })}
                    aria-pressed={active}
                  >
                    <span className="soc-origin-rank">{o.rank}</span>
                    <span className="soc-origin-name">{o.country || o.country_code}</span>
                    <span className="soc-origin-code">{o.country_code}</span>
                    <span className="soc-origin-count">{fmt(o.count)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {unknownPoint && (
          <button
            type="button"
            className={`soc-origin-row soc-origin-row--unknown${selectedCode === '??' ? ' soc-origin-row--active' : ''}`}
            onClick={() => onSelectCountry?.({ key: '??', label: 'Origem não determinada' })}
            aria-pressed={selectedCode === '??'}
          >
            <span className="soc-origin-rank" style={{ color: 'var(--amber)' }}>◉</span>
            <span className="soc-origin-name" style={{ color: 'var(--amber)' }}>Origem não determinada</span>
            <span className="soc-origin-code" style={{ color: 'var(--amber)' }}>??</span>
            <span className="soc-origin-count" style={{ color: 'var(--amber)' }}>{fmt(unknownPoint.count)}</span>
          </button>
        )}
        <button
          type="button"
          className="soc-report-btn"
          onClick={onOpenReport}
          disabled={!selectedCode}
          title={
            selectedCode
              ? `Ir para relatório de evidências — ${selectedLabel || selectedCode}`
              : 'Seleccione uma origem no mapa ou em Top Origens'
          }
          aria-label={
            selectedCode
              ? `Ver relatório completo de ${selectedLabel || selectedCode}`
              : 'Ver relatório completo — seleccione uma origem primeiro'
          }
        >
          Ver relatório completo →
        </button>
      </div>
    </aside>
  );
}
