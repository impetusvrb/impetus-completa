/**
 * Centro de Energia — Prompt Parte 4. Consumo / indicadores no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Zap } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid"><div className="cc-kpi__skeleton" /><div className="cc-kpi__skeleton" /></div>
    </div>
  );
}

export default function WidgetEnergia() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.getSummary()
      .then((r) => {
        setData(r?.data?.summary ?? r?.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-kpi cc-widget--error">
        <div className="cc-kpi__header"><Zap size={20} /> Energia</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const d = data ?? {};
  const consumo = d.consumo_energia ?? d.energy ?? 0;

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <Zap size={20} />
        <span>Centro de Energia</span>
      </div>
      <div className="cc-kpi__grid">
        <div className="cc-kpi__card cc-kpi__card--big">
          <span className="cc-kpi__value">{consumo}</span>
          <span className="cc-kpi__label">Consumo</span>
        </div>
      </div>
    </div>
  );
}
