import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function ProximasAtividadesWidget({ data = {} }) {
  const atividades = data.proximasAtividades ?? [];

  return (
    <section className="cc-widget dcl-widget">
      <div className="cc-kpi__header">
        <ChevronRight size={20} />
        <span>Próximas Atividades</span>
      </div>
      {atividades.length ? (
        <ul className="cc-alertas__list">
          {atividades.map((a) => (
            <li key={a.id} className="cc-alertas__item cc-alertas__item--medium">
              <span className="cc-alertas__msg">
                <strong>{a.titulo}</strong> · {a.prioridade}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cc-widget__empty">Nenhuma atividade na fila.</p>
      )}
    </section>
  );
}
