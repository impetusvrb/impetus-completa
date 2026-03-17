/**
 * Mapa Industrial Interativo — Prompt Parte 4. Diagrama de máquinas/status no grid.
 */
import React, { useState, useEffect } from 'react';
import { dashboard } from '../../../services/api';
import { Cpu } from 'lucide-react';

function Skeleton() {
  return (
    <div className="cc-widget cc-diagrama">
      <div className="cc-diagrama__header"><div className="cc-diagrama__sk" /></div>
      <div className="cc-diagrama__grid"><div className="cc-diagrama__sk-cell" /><div className="cc-diagrama__sk-cell" /><div className="cc-diagrama__sk-cell" /><div className="cc-diagrama__sk-cell" /></div>
    </div>
  );
}

export default function WidgetDiagramaIndustrial() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboard.industrial?.getMachines?.()
      .then((r) => {
        const raw = r?.data?.machines ?? r?.data ?? [];
        setMachines(Array.isArray(raw) ? raw.slice(0, 8) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-diagrama cc-widget--error">
        <div className="cc-diagrama__header"><Cpu size={20} /> Mapa Industrial</div>
        <p className="cc-widget__empty">Mapa indisponível.</p>
      </div>
    );
  }

  return (
    <div className="cc-widget cc-diagrama">
      <div className="cc-diagrama__header">
        <Cpu size={20} />
        <span>Mapa Industrial</span>
      </div>
      {machines.length === 0 ? (
        <p className="cc-widget__empty">Nenhuma máquina cadastrada para exibição.</p>
      ) : (
        <div className="cc-diagrama__grid">
          {machines.map((m, i) => (
            <div key={i} className={`cc-diagrama__cell cc-diagrama__cell--${(m.status || 'unknown').toLowerCase()}`} title={m.name || m.identifier}>
              <Cpu size={16} />
              <span className="cc-diagrama__name">{(m.name || m.identifier || `M${i + 1}`).slice(0, 8)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
