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

const COLORS = ['#00aaff', '#5ee4a0', '#a78bfa', '#fbbf24', '#f472b6', '#22d3ee', '#94a3b8'];

export default function ChartRenderer({ chartType = 'bar', data = [], title, visualOnly = false }) {
  const list = Array.isArray(data) ? data : [];
  const pieData = list.map((d) => ({
    name: d.name,
    value: typeof d.valor === 'number' ? d.valor : Number(d.valor) || 0
  }));

  if (!list.length) {
    if (visualOnly) return null;
    return (
      <div className="smart-panel-visual__empty">
        {title && <h5 className="smart-panel-visual__block-title">{title}</h5>}
        <p>Sem pontos para o gráfico.</p>
      </div>
    );
  }

  const h = 220;
  const commonAxis = {
    x: <XAxis dataKey="name" tick={{ fill: '#9cc', fontSize: 10 }} />,
    y: (
      <YAxis
        tick={{ fill: '#9cc', fontSize: 10 }}
        domain={[0, (max) => (Number.isFinite(max) && max > 0 ? Math.ceil(max * 1.12) : 1)]}
      />
    )
  };

  return (
    <div className="smart-panel-visual__chart-block">
      {title && <h5 className="smart-panel-visual__block-title">{title}</h5>}
      <ResponsiveContainer width="100%" height={h}>
        {chartType === 'line' ? (
          <LineChart data={list} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.12)" />
            {commonAxis.x}
            {commonAxis.y}
            <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
            <Line type="monotone" dataKey="valor" stroke="#00d4ff" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={list} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.12)" />
            {commonAxis.x}
            {commonAxis.y}
            <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
            <Area type="monotone" dataKey="valor" stroke="#00aaff" fill="rgba(0, 170, 255, 0.2)" strokeWidth={2} />
          </AreaChart>
        ) : chartType === 'pie' || chartType === 'donut' ? (
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? 48 : 0}
              outerRadius={72}
              paddingAngle={2}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
            {!visualOnly && <Legend />}
          </PieChart>
        ) : (
          <BarChart data={list} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.12)" />
            {commonAxis.x}
            {commonAxis.y}
            <Tooltip contentStyle={{ background: '#0a1528', border: '1px solid #1a4a7a' }} />
            <Bar dataKey="valor" fill="#00aaff" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
