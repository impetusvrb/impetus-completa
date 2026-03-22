import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AlertasWidget({ data = {} }) {
  const alertas = data.alertas ?? [];

  return (
    <section className="cc-widget dcl-widget">
      <div className="cc-kpi__header">
        <AlertTriangle size={20} />
        <span>Alertas</span>
      </div>
      {alertas.length ? (
        <ul className="cc-alertas__list">
          {alertas.map((a, i) => (
            <li key={i} className={`cc-alertas__item cc-alertas__item--${a.tipo || 'medium'}`}>
              <span className="cc-alertas__msg">{a.msg}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cc-widget__empty">Nenhum alerta no momento.</p>
      )}
    </section>
  );
}
