/**
 * Widget Indicadores executivos — Prompt Parte 5: faturamento, lucro, OEE, eficiência, desperdício.
 * Tudo exibido no grid; dados de summary/KPIs/costs.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { BarChart3, TrendingUp, Target, Activity } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="cc-kpi__card cc-kpi__skeleton" />
        ))}
      </div>
    </div>
  );
}

export default function WidgetIndicadoresExecutivos() {
  const [data, setData] = useState(null);
  const [costs, setCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      dashboard.getSummary().catch(() => ({ data: {} })),
      dashboard.costs?.getExecutiveSummary?.().catch(() => ({ data: {} }))
    ])
      .then(([s, c]) => {
        setData(s?.data?.summary ?? s?.data);
        setCosts(c?.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-kpi cc-widget--error">
        <div className="cc-kpi__header">Indicadores</div>
        <p className="cc-widget__empty">Não foi possível carregar.</p>
      </div>
    );
  }

  const exec = costs?.executive ?? costs ?? {};
  const sum = data ?? {};
  const items = [
    { value: exec.faturamento ?? sum.faturamento ?? 0, label: 'Faturamento', icon: BarChart3 },
    { value: exec.lucro ?? sum.lucro ?? 0, label: 'Lucro', icon: TrendingUp },
    { value: sum.oee ?? exec.oee ?? 0, label: 'OEE %', icon: Target },
    { value: sum.eficiencia ?? exec.eficiencia ?? 0, label: 'Eficiência', icon: Activity },
    { value: exec.desperdicio ?? sum.desperdicio ?? 0, label: 'Desperdício', icon: Activity },
    { value: exec.custo_industrial ?? sum.custo_industrial ?? 0, label: 'Custo ind.', icon: BarChart3 }
  ];

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <BarChart3 size={20} />
        <span>Indicadores executivos</span>
      </div>
      <div className="cc-kpi__grid cc-kpi__grid--3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="cc-kpi__card">
              <span className="cc-kpi__value">{typeof item.value === 'number' ? item.value : item.value ?? 0}</span>
              <span className="cc-kpi__label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
