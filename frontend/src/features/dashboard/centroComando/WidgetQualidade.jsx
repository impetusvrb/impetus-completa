/**
 * Centro de Qualidade — Prompt Parte 4/5. Aprovados/reprovados, não conformidade no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { CheckCircle } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid"><div className="cc-kpi__skeleton" /><div className="cc-kpi__skeleton" /></div>
    </div>
  );
}

export default function WidgetQualidade() {
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
        <div className="cc-kpi__header"><CheckCircle size={20} /> Qualidade</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  const d = data ?? {};
  const aprovados = d.aprovados ?? d.approved ?? 0;
  const reprovados = d.reprovados ?? d.rejected ?? 0;

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <CheckCircle size={20} />
        <span>Centro de Qualidade</span>
      </div>
      <div className="cc-kpi__grid">
        <div className="cc-kpi__card"><span className="cc-kpi__value">{aprovados}</span><span className="cc-kpi__label">Aprovados</span></div>
        <div className="cc-kpi__card"><span className="cc-kpi__value">{reprovados}</span><span className="cc-kpi__label">Reprovados</span></div>
      </div>
    </div>
  );
}
