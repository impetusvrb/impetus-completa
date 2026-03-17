/**
 * Centro de Estoque — Prompt Parte 4/5. Estoque atual, giro, alertas no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Package } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid"><div className="cc-kpi__skeleton" /><div className="cc-kpi__skeleton" /></div>
    </div>
  );
}

export default function WidgetEstoque() {
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
        <div className="cc-kpi__header"><Package size={20} /> Estoque</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const d = data ?? {};
  const total = d.estoque_total ?? d.stock ?? 0;
  const critico = d.estoque_critico ?? d.alertas_estoque ?? 0;

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <Package size={20} />
        <span>Estoque</span>
      </div>
      <div className="cc-kpi__grid">
        <div className="cc-kpi__card"><span className="cc-kpi__value">{total}</span><span className="cc-kpi__label">Total</span></div>
        <div className="cc-kpi__card"><span className="cc-kpi__value">{critico}</span><span className="cc-kpi__label">Crítico</span></div>
      </div>
    </div>
  );
}
