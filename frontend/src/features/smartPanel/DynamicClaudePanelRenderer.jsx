import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const COLORS = ['#00aaff', '#5ee4a0', '#a78bfa', '#fbbf24', '#f472b6', '#22d3ee', '#94a3b8'];
const AXIS = { tick: { fill: '#9cc', fontSize: 10 } };
const TOOLTIP = { contentStyle: { background: '#0a1528', border: '1px solid #1a4a7a', color: '#dceef8' } };

function buildComboRows(labels, datasets) {
  const L = Array.isArray(labels) ? labels : [];
  const D = Array.isArray(datasets) ? datasets : [];
  if (!L.length) return [{ name: '—', s0: 0 }];
  return L.map((name, i) => {
    const row = { name: String(name).slice(0, 32) };
    if (D.length === 0) {
      row.s0 = 0;
      return row;
    }
    D.forEach((ds, j) => {
      const v = Array.isArray(ds?.data) ? ds.data[i] : 0;
      row[`s${j}`] = Number.isFinite(Number(v)) ? Number(v) : 0;
    });
    return row;
  });
}

/**
 * @param {{ payload: object, className?: string, visualOnly?: boolean }} props
 */
export default function DynamicClaudePanelRenderer({ payload, className = '', visualOnly = false }) {
  const type = String(payload?.type || 'chart').toLowerCase();
  const title = payload?.title || '';
  const description = payload?.description || '';
  const out = payload?.output || {};

  const chartLabels = out.labels;
  const chartDatasets = out.datasets;
  const chartTypeRaw = out.chartType;

  const chartBlock = useMemo(() => {
    if (type !== 'chart') return null;
    const chartType = String(chartTypeRaw || 'bar').toLowerCase();
    const labels = chartLabels || [];
    const datasets = chartDatasets || [];
    const rows = buildComboRows(labels, datasets);
    const h = 240;

    if (chartType === 'pie' || chartType === 'donut') {
      const pieData = (labels.length ? labels : ['A', 'B', 'C']).map((name, i) => ({
        name: String(name),
        value: Number(datasets[0]?.data?.[i] ?? (i + 1) * 3)
      }));
      return (
        <div className="smart-panel-claude__chart">
          <ResponsiveContainer width="100%" height={h}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 52 : 0}
                outerRadius={86}
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP} />
              {!visualOnly && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    const seriesKeys = Object.keys(rows[0] || {}).filter((k) => k !== 'name');

    if (chartType === 'line') {
      return (
        <div className="smart-panel-claude__chart">
          <ResponsiveContainer width="100%" height={h}>
            <LineChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.12)" />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} />
              <Tooltip {...TOOLTIP} />
              {!visualOnly && <Legend />}
              {seriesKeys.map((k, j) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={datasets[j]?.label || `Série ${j + 1}`}
                  stroke={COLORS[j % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'area') {
      return (
        <div className="smart-panel-claude__chart">
          <ResponsiveContainer width="100%" height={h}>
            <AreaChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.12)" />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis {...AXIS} />
              <Tooltip {...TOOLTIP} />
              {!visualOnly && <Legend />}
              {seriesKeys.map((k, j) => (
                <Area
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={datasets[j]?.label || `Série ${j + 1}`}
                  stroke={COLORS[j % COLORS.length]}
                  fill={`${COLORS[j % COLORS.length]}33`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="smart-panel-claude__chart">
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.12)" />
            <XAxis dataKey="name" {...AXIS} />
            <YAxis {...AXIS} />
            <Tooltip {...TOOLTIP} />
            {!visualOnly && <Legend />}
            {seriesKeys.map((k, j) => (
              <Bar
                key={k}
                dataKey={k}
                name={datasets[j]?.label || `Série ${j + 1}`}
                fill={COLORS[j % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }, [type, visualOnly, chartTypeRaw, chartLabels, chartDatasets]);

  if (type === 'chart') {
    return (
      <div className={`smart-panel-claude ${className}`}>
        {!visualOnly && title && <h4 className="smart-panel-claude__title">{title}</h4>}
        {!visualOnly && description && <p className="smart-panel-claude__desc">{description}</p>}
        {visualOnly && (title || description) && (
          <span className="sr-only">
            {title} {description}
          </span>
        )}
        {chartBlock}
      </div>
    );
  }

  if (type === 'table') {
    const columns = out.columns || [];
    const rows = out.rows || [];
    return (
      <div className={`smart-panel-claude ${className}`}>
        {!visualOnly && title && <h4 className="smart-panel-claude__title">{title}</h4>}
        <div className="smart-panel-claude__table-wrap">
          <table className="smart-panel-claude__table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j}>{row[j] != null ? String(row[j]) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'kpi') {
    const cards = out.cards || [];
    return (
      <div className={`smart-panel-claude ${className}`}>
        {!visualOnly && title && <h4 className="smart-panel-claude__title">{title}</h4>}
        <div className="smart-panel-claude__kpi-grid">
          {cards.map((c, i) => (
            <div key={i} className="smart-panel-claude__kpi-card">
              <div className="smart-panel-claude__kpi-label">{c.label}</div>
              <div className="smart-panel-claude__kpi-value">{c.value}</div>
              {c.trend && (
                <div
                  className={`smart-panel-claude__kpi-trend ${
                    String(c.trend).trim().startsWith('+') || String(c.trend).includes('↑')
                      ? 'smart-panel-claude__kpi-trend--up'
                      : 'smart-panel-claude__kpi-trend--down'
                  }`}
                >
                  {c.trend}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'report') {
    const sections = out.sections || [];
    return (
      <div className={`smart-panel-claude smart-panel-claude--report ${className}`}>
        {!visualOnly && title && <h4 className="smart-panel-claude__title">{title}</h4>}
        {sections.map((s, i) => (
          <div key={i} className="smart-panel-claude__section">
            {s.heading && <h5 className="smart-panel-claude__section-head">{s.heading}</h5>}
            <p className="smart-panel-claude__section-body">{s.body}</p>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'alert') {
    const items = out.items || [];
    return (
      <div className={`smart-panel-claude ${className}`}>
        {!visualOnly && title && <h4 className="smart-panel-claude__title">{title}</h4>}
        <div className="smart-panel-claude__alerts">
          {items.map((it, i) => (
            <div key={i} className={`smart-panel-claude__alert smart-panel-claude__alert--${it.level || 'info'}`}>
              {it.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`smart-panel-claude smart-panel-claude--empty ${className}`}>
      <span className="sr-only">{title}</span>
    </div>
  );
}
