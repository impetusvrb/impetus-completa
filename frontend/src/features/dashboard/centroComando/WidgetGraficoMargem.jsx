/**
 * Widget Margem por produto — Prompt Parte 5 (gráficos CEO/Financeiro).
 */
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboard } from '../../../services/api';
import { PieChart } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header"><div className="cc-chart__skeleton" /></div>
      <div className="cc-chart__skeleton-chart" />
    </div>
  );
}

export default function WidgetGraficoMargem() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.costs?.getByOrigin?.()
      .then((r) => {
        const raw = r?.data?.data ?? r?.data ?? [];
        const arr = Array.isArray(raw) ? raw.slice(0, 6) : [];
        setData(arr.length ? arr.map((d) => ({ nome: d.origin || d.name || '-', margem: d.margem ?? d.value ?? 0 })) : [{ nome: '-', margem: 0 }]);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-chart cc-widget--error">
        <div className="cc-chart__header"><PieChart size={20} /> Margem</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header">
        <PieChart size={20} />
        <span>Margem</span>
      </div>
      <div className="cc-chart__body">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cc-grid, rgba(0,0,0,0.06))" />
            <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="margem" fill="var(--cc-secondary, #10b981)" name="Margem %" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
