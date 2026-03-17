/**
 * Centro de Manutenção — Prompt Parte 5. MTBF, MTTR, OS no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Wrench } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid"><div className="cc-kpi__skeleton" /><div className="cc-kpi__skeleton" /><div className="cc-kpi__skeleton" /></div>
    </div>
  );
}

export default function WidgetManutencao() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.maintenance?.getSummary?.()
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
        <div className="cc-kpi__header"><Wrench size={20} /> Manutenção</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const d = data ?? {};
  const items = [
    { value: d.mtbf ?? d.MTBF ?? 0, label: 'MTBF (h)' },
    { value: d.mttr ?? d.MTTR ?? 0, label: 'MTTR (h)' },
    { value: d.os_abertas ?? d.work_orders_open ?? 0, label: 'OS abertas' }
  ];

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <Wrench size={20} />
        <span>Centro de Manutenção</span>
      </div>
      <div className="cc-kpi__grid">
        {items.map((item, i) => (
          <div key={i} className="cc-kpi__card">
            <span className="cc-kpi__value">{item.value}</span>
            <span className="cc-kpi__label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
