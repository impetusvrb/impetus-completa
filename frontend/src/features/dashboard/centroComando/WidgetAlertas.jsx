/**
 * Widget Alertas (Prompt v3 Parte 8).
 * Lista de alertas exibida no grid; sem link para outra página.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { AlertTriangle } from 'lucide-react';

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

export default function WidgetAlertas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      dashboard.operationalBrain?.getAlerts?.({ limit: 5 }).catch(() => ({ data: { alerts: [] } })),
      dashboard.getPlcAlerts?.(false).catch(() => ({ data: [] }))
    ])
      .then(([a, b]) => {
        const list = a?.data?.alerts || a?.data || [];
        const plc = Array.isArray(b?.data) ? b.data : [];
        setItems([...list.slice(0, 5), ...plc.slice(0, 3)].slice(0, 6));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-alertas cc-widget--error">
        <div className="cc-alertas__header"><AlertTriangle size={20} /> Alertas</div>
        <p className="cc-widget__empty">Não foi possível carregar os alertas.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-alertas">
      <div className="cc-alertas__header">
        <AlertTriangle size={20} />
        <span>Alertas</span>
      </div>
      {items.length === 0 ? (
        <p className="cc-widget__empty">Nenhum alerta no momento.</p>
      ) : (
        <ul className="cc-alertas__list">
          {items.map((a, i) => (
            <li key={i} className={`cc-alertas__item cc-alertas__item--${(a.severity || 'medium').toLowerCase()}`}>
              <span className="cc-alertas__title">{a.title || a.message || 'Alerta'}</span>
              {a.message && a.message !== (a.title || '') && <span className="cc-alertas__msg">{a.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
