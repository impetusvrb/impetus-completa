/**
 * Mapa de Vazamentos — Prompt Parte 4. Ranking/diagrama de perdas no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { MapPin } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-mapa">
      <div className="cc-mapa__header"><div className="cc-mapa__sk" /></div>
      <ul className="cc-mapa__list"><li className="cc-mapa__sk-item" /><li className="cc-mapa__sk-item" /><li className="cc-mapa__sk-item" /></ul>
    </div>
  );
}

export default function WidgetMapaVazamentos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.financialLeakage?.getRanking?.()
      .then((r) => {
        const raw = r?.data?.ranking ?? r?.data?.data ?? r?.data ?? [];
        setItems(Array.isArray(raw) ? raw.slice(0, 6) : []);
      })
      .catch(() => {
        dashboard.costs?.getTopLoss?.().then((r) => {
          const raw = r?.data?.list ?? r?.data ?? [];
          setItems(Array.isArray(raw) ? raw.slice(0, 6) : []);
        }).catch(() => setError(true));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-mapa cc-widget--error">
        <div className="cc-mapa__header"><MapPin size={20} /> Mapa de Vazamentos</div>
        <p className="cc-widget__empty">Dados indisponíveis.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-mapa">
      <div className="cc-mapa__header">
        <MapPin size={20} />
        <span>Mapa de Vazamentos</span>
      </div>
      {items.length === 0 ? (
        <p className="cc-widget__empty">Nenhum vazamento identificado no período.</p>
      ) : (
        <ul className="cc-mapa__list">
          {items.map((item, i) => (
            <li key={i} className="cc-mapa__item">
              <span className="cc-mapa__rank">{i + 1}</span>
              <span className="cc-mapa__label">{item.origin || item.name || item.area || '-'}</span>
              <span className="cc-mapa__valor">{item.value ?? item.total ?? item.impacto ?? 0}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
