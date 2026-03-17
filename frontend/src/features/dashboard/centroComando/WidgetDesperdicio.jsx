/**
 * Centro de Desperdício — Prompt Parte 4/5. Top perdas / desperdício no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Trash2 } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-custos">
      <div className="cc-custos__header"><div className="cc-custos__sk" /></div>
      <ul className="cc-custos__list"><li className="cc-custos__sk-item" /><li className="cc-custos__sk-item" /></ul>
    </div>
  );
}

export default function WidgetDesperdicio() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.costs?.getTopLoss?.()
      .then((r) => {
        const raw = r?.data?.list ?? r?.data ?? [];
        setItems(Array.isArray(raw) ? raw.slice(0, 5) : []);
      })
      .catch(() => {
        dashboard.financialLeakage?.getRanking?.().then((r) => {
          const raw = r?.data?.ranking ?? r?.data ?? [];
          setItems(Array.isArray(raw) ? raw.slice(0, 5) : []);
        }).catch(() => setError(true));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-custos cc-widget--error">
        <div className="cc-custos__header"><Trash2 size={20} /> Desperdício</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-custos">
      <div className="cc-custos__header">
        <Trash2 size={20} />
        <span>Centro de Desperdício</span>
      </div>
      {items.length === 0 ? (
        <p className="cc-widget__empty">Nenhum desperdício reportado no período.</p>
      ) : (
        <ul className="cc-custos__list">
          {items.map((item, i) => (
            <li key={i} className="cc-custos__item">
              <span className="cc-custos__label">{item.origin || item.name || '-'}</span>
              <span className="cc-custos__valor">{item.value ?? item.perda ?? 0}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
