/**
 * Widget de KPIs — números no grid (Prompt v3 Parte 5).
 * Exibe dados no próprio card; sem link para outro módulo.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { BarChart3, TrendingUp, Target, Activity, Zap } from 'lucide-react';

const ICONS = [BarChart3, TrendingUp, Target, Activity, Zap];

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="cc-kpi__card cc-kpi__skeleton" />
        ))}
      </div>
    </div>
  );
}

export default function WidgetKpiCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.getSummary()
      .then((r) => {
        const s = r?.data?.summary;
        if (s) setData(s);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-kpi cc-widget--error">
        <div className="cc-kpi__header">Indicadores</div>
        <p className="cc-widget__empty">Não foi possível carregar. Tente novamente.</p>
      </div>
    );
  }

  const inter = data?.operational_interactions?.total ?? 0;
  const insights = data?.ai_insights?.total ?? 0;
  const alertsCrit = data?.alerts?.critical ?? 0;
  const proposals = data?.proposals?.total ?? 0;
  const items = [
    { value: inter, label: 'Interações', icon: 0 },
    { value: insights, label: 'Insights IA', icon: 1 },
    { value: alertsCrit, label: 'Alertas crít.', icon: 2 },
    { value: proposals, label: 'Propostas', icon: 3 }
  ];

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <BarChart3 size={20} />
        <span>Indicadores</span>
      </div>
      <div className="cc-kpi__grid">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] || BarChart3;
          return (
            <div key={i} className="cc-kpi__card">
              <span className="cc-kpi__value">{item.value}</span>
              <span className="cc-kpi__label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
