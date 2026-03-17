/**
 * Centro de Previsão — Prompt Parte 4 + 7. Projeções e simulação no grid; IA (forecasting.ask).
 */
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboard } from '../../../services/api';
import { Calendar } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header"><div className="cc-chart__skeleton" /></div>
      <div className="cc-chart__skeleton-chart" />
    </div>
  );
}

export default function WidgetCentroPrevisao() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.forecasting?.getProjections?.('eficiencia')
      .then((r) => {
        const raw = r?.data?.projections ?? r?.data?.data ?? r?.data ?? [];
        const arr = Array.isArray(raw) ? raw.slice(0, 14) : [];
        setData(arr.length ? arr.map((d) => ({ nome: d.periodo || d.label || d.date || '-', valor: d.value ?? d.eficiencia ?? 0 })) : [{ nome: '-', valor: 0 }]);
      })
      .catch(() => {
        dashboard.getTrend?.(1).then((r) => {
          const raw = r?.data?.data ?? r?.data ?? [];
          setData(Array.isArray(raw) ? raw.slice(-7).map((d) => ({ nome: d.label || '-', valor: d.valor ?? 0 })) : [{ nome: '-', valor: 0 }]);
        }).catch(() => setError(true));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-chart cc-widget--error">
        <div className="cc-chart__header"><Calendar size={20} /> Previsão</div>
        <p className="cc-widget__empty">Previsão indisponível.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header">
        <Calendar size={20} />
        <span>Previsão 7/14/30 dias</span>
      </div>
      <div className="cc-chart__body">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cc-grid, rgba(0,0,0,0.06))" />
            <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="valor" stroke="var(--cc-primary, #1e90ff)" fill="var(--cc-primary-light, rgba(30,144,255,0.2))" strokeWidth={2} name="Projeção" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
