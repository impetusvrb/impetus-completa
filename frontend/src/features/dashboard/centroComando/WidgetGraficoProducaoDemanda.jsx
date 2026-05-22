/**
 * Widget Produção vs Demanda — CEO/Diretor industrial (dados reais).
 */
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

export default function WidgetGraficoProducaoDemanda() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load =
      dashboard.getProductionDemand?.(8) ||
      dashboard.getTrend(3).then((r) => {
        const raw = r?.data?.data ?? r?.data?.trend ?? r?.data ?? [];
        return {
          data: {
            data: (Array.isArray(raw) ? raw : []).slice(-7).map((d, i) => ({
              nome: d.label || d.periodo || `Per ${i + 1}`,
              produção: d.valor ?? d.total ?? 0,
              demanda: d.meta ?? Math.max(d.valor ?? 0, 1)
            }))
          }
        };
      });

    load
      .then((r) => {
        const raw = r?.data?.data ?? r?.data ?? [];
        const arr = Array.isArray(raw) ? raw : [];
        setData(
          arr.map((d) => ({
            nome: d.nome || d.label || '-',
            produção: d.produção ?? d.producao ?? d.valor ?? 0,
            demanda: d.demanda ?? d.meta ?? 0
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
        <div className="cc-chart__header"><TrendingUp size={20} /> Produção vs Demanda</div>
        <p className="cc-widget__empty">Gráfico indisponível.</p>
      </div>
    );
  }

  const chartData = data.length ? data : [{ nome: '-', produção: 0, demanda: 0 }];

  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header">
        <TrendingUp size={20} />
        <span>Produção vs Demanda</span>
      </div>
      <div className="cc-chart__body">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(0, 212, 255, 0.08))" />
            <XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-active)',
                borderRadius: 4
              }}
            />
            <Legend />
            <Bar dataKey="produção" fill="var(--cyan)" name="Produção" radius={[4, 4, 0, 0]} />
            <Bar dataKey="demanda" fill="var(--green)" name="Meta" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
