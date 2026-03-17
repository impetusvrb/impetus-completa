/**
 * Widget Custos por setor — Prompt Parte 5 (gráficos CEO/Financeiro).
 * Dados do centro de custos no grid.
 */
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboard } from '../../../services/api';
import { DollarSign } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header"><div className="cc-chart__skeleton" /></div>
      <div className="cc-chart__skeleton-chart" />
    </div>
  );
}

export default function WidgetGraficoCustosSetor() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.costs?.getByOrigin?.()
      .then((r) => {
        const raw = r?.data?.data ?? r?.data?.origins ?? r?.data ?? [];
        const arr = Array.isArray(raw) ? raw : [];
        const mapped = arr.slice(0, 8).map((d) => ({
          setor: d.origin || d.setor || d.name || d.label || '-',
          valor: d.value ?? d.total ?? d.custo ?? 0
        }));
        if (mapped.length) setData(mapped);
        else setData([{ setor: '-', valor: 0 }]);
      })
      .catch(() => {
        dashboard.getTrend?.(2).then((r) => {
          const raw = r?.data?.data ?? r?.data ?? [];
          const arr = Array.isArray(raw) ? raw.slice(-5) : [];
          setData(arr.length ? arr.map((d, i) => ({ setor: d.label || `Setor ${i + 1}`, valor: d.valor ?? 0 })) : [{ setor: '-', valor: 0 }]);
        }).catch(() => setError(true));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-chart cc-widget--error">
        <div className="cc-chart__header"><DollarSign size={20} /> Custos por setor</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header">
        <DollarSign size={20} />
        <span>Custos por setor</span>
      </div>
      <div className="cc-chart__body">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cc-grid, rgba(0,0,0,0.06))" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="setor" type="category" width={80} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="valor" fill="var(--cc-primary, #1e90ff)" name="Custo" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
