import React, { useMemo } from 'react';

/**
 * Gráfico de barras compacto — alturas em px (evita % quebrado em flex column).
 * Dados reais: { label, count }[] — sem mocks.
 */
export default function SocBarChart({
  title,
  series,
  emptyLabel,
  plotHeight = 96,
  compactThreshold = 14,
}) {
  const { values, total, max, hasData } = useMemo(() => {
    const rows = series || [];
    const vals = rows.map((s) => Math.max(0, Number(s.count) || 0));
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      values: vals,
      total: sum,
      max: Math.max(1, ...vals, 1),
      hasData: sum > 0,
    };
  }, [series]);

  const compact = hasData && total <= compactThreshold;
  const barArea = compact ? Math.min(56, plotHeight) : plotHeight;

  return (
    <div className={`card soc-bar-chart${compact ? ' soc-bar-chart--compact' : ''}`}>
      <div className="soc-bar-chart-title">{title}</div>
      {!hasData ? (
        <p className="muted soc-bar-chart-empty">
          {emptyLabel || 'Sem volume significativo no período — estado nominal.'}
        </p>
      ) : (
        <>
          {compact && (
            <p className="muted soc-bar-chart-hint">
              Volume baixo ({total.toLocaleString('pt-BR')} evento{total === 1 ? '' : 's'} no período)
            </p>
          )}
          <div
            className="soc-bar-chart-plot"
            style={{ height: barArea }}
            role="img"
            aria-label={`${title}: ${total} eventos no total`}
          >
            {(series || []).map((s, i) => {
              const count = values[i] || 0;
              const barPx = count > 0 ? Math.max(3, Math.round((count / max) * (barArea - 8))) : 2;
              return (
                <div key={s.label || i} className="soc-bar-chart-col">
                  <div
                    className="soc-bar-chart-bar"
                    title={`${s.label}: ${count} evento${count === 1 ? '' : 's'}`}
                    style={{ height: barPx }}
                  />
                  <span className="soc-bar-chart-label">{s.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
