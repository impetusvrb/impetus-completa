/**
 * Centro de Performance — Prompt Parte 5. OEE, eficiência no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Activity } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid"><div className="cc-kpi__skeleton" /><div className="cc-kpi__skeleton" /></div>
    </div>
  );
}

export default function WidgetPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.getSummary()
      .then((r) => {
        const s = r?.data?.summary ?? r?.data;
        setData(s);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-kpi cc-widget--error">
        <div className="cc-kpi__header"><Activity size={20} /> Performance</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const oee = data?.oee ?? data?.global_oee ?? 0;
  const eff = data?.eficiencia ?? data?.efficiency ?? 0;

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <Activity size={20} />
        <span>Centro de Performance</span>
      </div>
      <div className="cc-kpi__grid">
        <div className="cc-kpi__card cc-kpi__card--big">
          <span className="cc-kpi__value">{oee}</span>
          <span className="cc-kpi__label">OEE %</span>
        </div>
        <div className="cc-kpi__card cc-kpi__card--big">
          <span className="cc-kpi__value">{eff}</span>
          <span className="cc-kpi__label">Eficiência</span>
        </div>
      </div>
    </div>
  );
}
