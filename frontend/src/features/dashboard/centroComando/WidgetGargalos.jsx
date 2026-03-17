/**
 * Centro de Gargalos — Prompt Parte 4/5. Lista de gargalos no grid (operationalBrain ou summary).
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { AlertCircle } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header"><div className="cc-alertas__skeleton" /></div>
      <ul className="cc-alertas__list"><li className="cc-alertas__skeleton-item" /><li className="cc-alertas__skeleton-item" /></ul>
    </div>
  );
}

export default function WidgetGargalos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.operationalBrain?.getInsights?.({ limit: 5 })
      .then((r) => {
        const raw = r?.data?.insights ?? r?.data ?? [];
        setItems(Array.isArray(raw) ? raw.filter((x) => x.type === 'bottleneck' || (x.title && x.title.toLowerCase().includes('gargalo'))).slice(0, 5) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-alertas cc-widget--error">
        <div className="cc-alertas__header"><AlertCircle size={20} /> Gargalos</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header">
        <AlertCircle size={20} />
        <span>Centro de Gargalos</span>
      </div>
      {items.length === 0 ? (
        <p className="cc-widget__empty">Nenhum gargalo identificado.</p>
      ) : (
        <ul className="cc-alertas__list">
          {items.map((item, i) => (
            <li key={i} className="cc-alertas__item cc-alertas__item--medium">
              <span className="cc-alertas__title">{item.title || item.message || 'Gargalo'}</span>
              {item.description && <span className="cc-alertas__msg">{item.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
