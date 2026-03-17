/**
 * Centro de Receitas — Prompt Parte 4. Receitas industriais no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { BookOpen } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid"><div className="cc-kpi__skeleton" /></div>
    </div>
  );
}

export default function WidgetReceitas() {
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
        <div className="cc-kpi__header"><BookOpen size={20} /> Receitas</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const total = data?.receitas ?? data?.recipes ?? 0;

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <BookOpen size={20} />
        <span>Centro de Receitas</span>
      </div>
      <div className="cc-kpi__grid">
        <div className="cc-kpi__card cc-kpi__card--big">
          <span className="cc-kpi__value">{total}</span>
          <span className="cc-kpi__label">Receitas ativas</span>
        </div>
      </div>
    </div>
  );
}
