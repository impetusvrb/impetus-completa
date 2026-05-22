/**
 * Widget Gráfico de Tendência — dados reais via GET /dashboard/trend.
 */
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboard } from '../../../services/api';
import { TrendingUp } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header"><div className="cc-chart__skeleton" /></div>
      <div className="cc-chart__skeleton-chart" />
    </div>
  );
}

export default function WidgetGraficoTendencia() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard
      .getTrend(6)
      .then((r) => {
        const raw = r?.data?.data ?? r?.data?.trend ?? r?.data ?? [];
        const arr = Array.isArray(raw) ? raw : [];
        setData(
          arr.slice(-14).map((d) => ({
            name: d.label || d.periodo || d.mes || d.name || '-',
            valor: d.valor ?? d.total ?? d.count ?? 0
          }))
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-chart cc-widget--error">
        <div className="cc-chart__header"><TrendingUp size={20} /> Tendência</div>
        <p className="cc-widget__empty">Gráfico indisponível.</p>
      </div>
    );
  }

  const chartData = data.length ? data : [{ name: '-', valor: 0 }];

  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header">
        <TrendingUp size={20} />
        <span>Tendência</span>
      </div>
      <div className="cc-chart__body">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(0, 212, 255, 0.08))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} width={32} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-active)',
                borderRadius: 4
              }}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="var(--cyan)"
              fill="var(--cyan)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
