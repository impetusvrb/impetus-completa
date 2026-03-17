/**
 * Widget Gráfico de Tendência (Prompt v3 Parte 5 — gráficos no grid).
 * Dados exibidos no próprio widget; sem link para outro módulo.
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
    dashboard.getTrend?.(3)
      .then((r) => {
        const raw = r?.data?.data ?? r?.data?.trend ?? r?.data ?? [];
        const arr = Array.isArray(raw) ? raw : [];
        setData(arr.slice(-14).map((d) => ({
          name: d.label || d.periodo || d.mes || d.name || '-',
          valor: d.valor ?? d.total ?? d.count ?? 0
        })));
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cc-grid, rgba(0,0,0,0.06))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="valor" stroke="var(--cc-primary, #1e90ff)" fill="var(--cc-primary-light, rgba(30,144,255,0.2))" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
