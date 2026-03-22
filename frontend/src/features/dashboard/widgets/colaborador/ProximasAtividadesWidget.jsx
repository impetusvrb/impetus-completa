/**
 * Widget Próximas Atividades — Dashboard Colaborador Dinâmico
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function ProximasAtividadesWidget({ data = {}, widgetClass = 'dcl-widget' }) {
  const atividades = data.proximasAtividades ?? [
    { id: 1, titulo: 'Troca de ferramenta linha 2', prioridade: 'alta' },
    { id: 2, titulo: 'Verificação qualidade lote', prioridade: 'normal' }
  ];

  return (
    <section className={`cc-widget ${widgetClass}`} style={{ gridColumn: 'span 2' }}>
      <div className="cc-kpi__header">
        <ChevronRight size={20} />
        <span>Próximas Atividades</span>
      </div>
      {atividades?.length ? (
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
