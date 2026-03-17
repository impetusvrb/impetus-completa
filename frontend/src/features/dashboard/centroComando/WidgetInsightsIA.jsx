/**
 * Insights IA — Prompt Parte 6. Lista de insights do Cérebro Operacional no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Brain } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header"><div className="cc-alertas__skeleton" /></div>
      <ul className="cc-alertas__list">
        {[1, 2, 3].map((i) => (
          <li key={i} className="cc-alertas__skeleton-item" />
        ))}
      </ul>
    </div>
  );
}

export default function WidgetInsightsIA() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.operationalBrain?.getInsights?.({ limit: 6 })
      .then((r) => {
        const raw = r?.data?.insights ?? r?.data ?? [];
        setItems(Array.isArray(raw) ? raw.slice(0, 6) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-alertas cc-widget--error">
        <div className="cc-alertas__header"><Brain size={20} /> Insights IA</div>
        <p className="cc-widget__empty">Insights indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header">
        <Brain size={20} />
        <span>Insights IA</span>
      </div>
      {items.length === 0 ? (
        <p className="cc-widget__empty">Nenhum insight no momento. Use &quot;Pergunte à IA&quot; para análises.</p>
      ) : (
        <ul className="cc-alertas__list">
          {items.map((item, i) => (
            <li key={i} className="cc-alertas__item cc-alertas__item--low">
              <span className="cc-alertas__title">{item.title || item.summary || item.message || 'Insight'}</span>
              {item.description && <span className="cc-alertas__msg">{item.description}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
