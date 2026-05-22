/**
 * Gráfico Recharts unificado — bar | line | area | pie | donut.
 * Padrão visual Industrial 4.0 em todo o software.
 */
import React from 'react';
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
import {
  CHART_COLORS,
  CHART_SERIES_PALETTE,
  chartAxisTick,
  chartLegendStyle,
  chartTooltipStyle,
  chartGradientId
} from './chartTheme';

const DEFAULT_HEIGHT = 220;

export default function ImpetusChart({
  chartType = 'bar',
  data = [],
  dataKey = 'valor',
  nameKey = 'name',
  seriesKeys = null,
  seriesNames = null,
  height = DEFAULT_HEIGHT,
  layout = 'horizontal',
  showLegend = false,
  visualOnly = false,
  emptyMessage = 'Sem pontos para o gráfico.'
}) {
  const list = Array.isArray(data) ? data : [];

  if (!list.length) {
    if (visualOnly) return null;
    return <p className="impetus-chart__empty">{emptyMessage}</p>;
  }

  const multi =
    Array.isArray(seriesKeys) && seriesKeys.length > 0
      ? seriesKeys
      : list[0] && Object.keys(list[0]).filter((k) => k.startsWith('s') && k !== 'name').length
        ? Object.keys(list[0]).filter((k) => k.startsWith('s'))
        : null;

  const h = height;
  const tooltip = chartTooltipStyle();
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />;
  const xHoriz = <XAxis dataKey={nameKey} tick={chartAxisTick} />;
  const yHoriz = (
    <YAxis
      tick={chartAxisTick}
      width={36}
      allowDecimals={false}
      domain={[0, (max) => (Number.isFinite(max) && max > 0 ? Math.ceil(max * 1.12) : 1)]}
    />
  );
  const xVert = <XAxis type="number" tick={chartAxisTick} />;
  const yVert = <YAxis dataKey={nameKey} type="category" width={88} tick={chartAxisTick} />;

  const type = String(chartType || 'bar').toLowerCase();

  if (type === 'pie' || type === 'donut') {
    const pieData = list.map((d) => ({
      name: d[nameKey] ?? d.name,
      value: typeof d[dataKey] === 'number' ? d[dataKey] : Number(d.valor ?? d.value) || 0
    }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={type === 'donut' ? 48 : 0}
            outerRadius={72}
            paddingAngle={2}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltip} />
          {!visualOnly && showLegend && <Legend wrapperStyle={chartLegendStyle} />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    const keys = multi || [dataKey];
    return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={list} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          {grid}
          {xHoriz}
          {yHoriz}
          <Tooltip {...tooltip} />
          {showLegend && <Legend wrapperStyle={chartLegendStyle} />}
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={seriesNames?.[i] || k}
              stroke={CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'area') {
    const keys = multi || [dataKey];
    const grad = chartGradientId('area-main');
    return (
      <ResponsiveContainer width="100%" height={h}>
        <AreaChart data={list} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.cyan} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}
          {xHoriz}
          {yHoriz}
          <Tooltip {...tooltip} />
          {showLegend && <Legend wrapperStyle={chartLegendStyle} />}
          {keys.length === 1 ? (
            <Area
              type="monotone"
              dataKey={keys[0]}
              stroke={CHART_COLORS.cyan}
              fill={`url(#${grad})`}
              strokeWidth={2}
            />
          ) : (
            keys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                name={seriesNames?.[i] || k}
                stroke={CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length]}
                fill={CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length]}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (layout === 'vertical') {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={list} layout="vertical" margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {grid}
          {xVert}
          {yVert}
          <Tooltip {...tooltip} />
          <Bar dataKey={dataKey} fill={CHART_COLORS.amber} radius={[0, 3, 3, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const keys = multi || [dataKey];
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={list} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        {grid}
        {xHoriz}
        {yHoriz}
        <Tooltip {...tooltip} />
        {showLegend && <Legend wrapperStyle={chartLegendStyle} />}
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            name={seriesNames?.[i] || k}
            fill={CHART_SERIES_PALETTE[i % CHART_SERIES_PALETTE.length]}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
