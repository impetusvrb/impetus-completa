/**
 * Centro de Operações — Prompt Parte 4/5. Produção, linhas, status no grid.
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

export default function WidgetOperacoes() {
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
        <div className="cc-kpi__header"><Activity size={20} /> Operações</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const d = data ?? {};
  const prod = d.production_total ?? d.producao ?? d.total ?? 0;
  const linhas = d.linhas_ativas ?? d.lines ?? 0;

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <Activity size={20} />
        <span>Centro de Operações</span>
      </div>
      <div className="cc-kpi__grid">
        <div className="cc-kpi__card cc-kpi__card--big">
          <span className="cc-kpi__value">{prod}</span>
          <span className="cc-kpi__label">Produção</span>
        </div>
        <div className="cc-kpi__card cc-kpi__card--big">
          <span className="cc-kpi__value">{linhas}</span>
          <span className="cc-kpi__label">Linhas ativas</span>
        </div>
      </div>
    </div>
  );
}
