/**
 * GRÁFICO DE TENDÊNCIA OPERACIONAL
 * Gráfico de área mostrando evolução das interações
 */

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './TrendChart.css';

/** Cores alinhadas a styles/tokens.css (--chart-*) para evitar grid/tooltip claros */
const CHART = {
  grid: 'rgba(14, 40, 72, 0.45)',
  axis: '#7a9ab8',
  series: '#1a6fff',
  tooltipBg: '#050d1a',
  tooltipBorder: '#0e2848',
  tooltipLabel: '#b8cce0'
};

export default function TrendChart({ data = [], loading = false }) {
  // Dados de exemplo se não houver dados
  const defaultData = [
    { month: 'Set', interactions: 850 },
    { month: 'Out', interactions: 920 },
    { month: 'Nov', interactions: 980 },
    { month: 'Dez', interactions: 1050 },
    { month: 'Jan', interactions: 1150 },
    { month: 'Fev', interactions: 1180 },
    { month: 'Mar', interactions: 1202 }
  ];

  const chartData = data.length > 0 ? data : defaultData;
  const lastValue = chartData[chartData.length - 1]?.interactions || 0;

  if (loading) {
    return (
      <div className="trend-chart-card">
        <div className="chart-header">
          <h3>Tendência Operacional</h3>
        </div>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trend-chart-card">
      <div className="chart-header">
        <h3>Tendência Operacional</h3>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-dot"></span>
            Interações
          </span>
          <span className="chart-value">{lastValue.toLocaleString('pt-BR')} interações</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART.series} stopOpacity={0.35} />
              <stop offset="95%" stopColor={CHART.series} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
          <XAxis dataKey="month" stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} />
          <YAxis stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: CHART.tooltipBg,
              border: `1px solid ${CHART.tooltipBorder}`,
              borderRadius: '8px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.55)'
            }}
            labelStyle={{ color: CHART.tooltipLabel, fontWeight: 600 }}
            itemStyle={{ color: CHART.series }}
          />
          <Area
            type="monotone"
            dataKey="interactions"
            stroke={CHART.series}
            strokeWidth={2}
            fill="url(#colorInteractions)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
