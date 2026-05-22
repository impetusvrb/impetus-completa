/**
 * Widget Clima Pulse RH — gráfico de área (4 dimensões), só perfil RH.
 */
import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { dashboard } from '../../../services/api';
import { Users } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header"><div className="cc-chart__skeleton" /></div>
      <div className="cc-chart__skeleton-chart" />
    </div>
  );
}

const SERIES = [
  { key: 'efficiency', name: 'Eficiência', color: 'var(--cyan)' },
  { key: 'confidence', name: 'Confiança', color: 'var(--green)' },
  { key: 'proactivity', name: 'Proatividade', color: 'var(--amber)' },
  { key: 'synergy', name: 'Sinergia', color: 'var(--orange)' }
];

export default function WidgetGraficoClimaEquipe() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard
      .getPulseClimate(8)
      .then((r) => {
        const raw = r?.data?.data ?? r?.data ?? [];
        const arr = Array.isArray(raw) ? raw : [];
        setData(
          arr.map((d) => ({
            name: d.label || '-',
            efficiency: Number(d.efficiency) || 0,
            confidence: Number(d.confidence) || 0,
            proactivity: Number(d.proactivity) || 0,
            synergy: Number(d.synergy) || 0
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
        <div className="cc-chart__header"><Users size={20} /> Clima da equipe</div>
        <p className="cc-widget__empty">Sem dados Pulse no período.</p>
      </div>
    );
  }

  const chartData = data.length ? data : [{ name: '-', efficiency: 0, confidence: 0, proactivity: 0, synergy: 0 }];

  return (
    <div className="cc-widget cc-chart">
      <div className="cc-chart__header">
        <Users size={20} />
        <span>Clima da equipe (Pulse)</span>
      </div>
      <div className="cc-chart__body">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(0, 212, 255, 0.08))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--text3)' }} width={28} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-active)',
                borderRadius: 4
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
