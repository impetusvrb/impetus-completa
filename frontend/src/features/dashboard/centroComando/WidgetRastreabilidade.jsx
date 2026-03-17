/**
 * Centro de Rastreabilidade — Prompt Parte 4. Lotes no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { FileSearch } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header"><div className="cc-alertas__skeleton" /></div>
      <ul className="cc-alertas__list"><li className="cc-alertas__skeleton-item" /></ul>
    </div>
  );
}

export default function WidgetRastreabilidade() {
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
      <div className="cc-widget cc-alertas cc-widget--error">
        <div className="cc-alertas__header"><FileSearch size={20} /> Rastreabilidade</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const lotes = data?.lotes ?? data?.lots ?? 0;

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <FileSearch size={20} />
        <span>Rastreabilidade</span>
      </div>
      <div className="cc-kpi__grid">
        <div className="cc-kpi__card cc-kpi__card--big">
          <span className="cc-kpi__value">{lotes}</span>
          <span className="cc-kpi__label">Lotes rastreados</span>
        </div>
      </div>
    </div>
  );
}
