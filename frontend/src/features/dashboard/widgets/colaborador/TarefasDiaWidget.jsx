/**
 * Widget Minhas Tarefas do Dia — Dashboard Colaborador Dinâmico
 */
import React from 'react';
import { ClipboardList } from 'lucide-react';

export default function TarefasDiaWidget({ data = {}, widgetClass = 'dcl-widget' }) {
  const tarefasHoje = data.tarefasHoje ?? 5;
  const tarefasConcluidas = data.tarefasConcluidas ?? 2;
  const percent = tarefasHoje > 0 ? Math.round((tarefasConcluidas / tarefasHoje) * 100) : 0;
  const statusClass = percent >= 80 ? 'green' : percent >= 50 ? 'amber' : 'red';

  return (
    <section className={`cc-widget ${widgetClass}`} style={{ gridColumn: 'span 2' }}>
      <div className="cc-kpi__header">
        <ClipboardList size={20} />
        <span>Minhas Tarefas do Dia</span>
        <span className={`status-dot ${statusClass}`} />
      </div>
      <div className="dcl-status-row">
        <div className="cc-kpi__grid">
          <div className="cc-kpi__card green">
            <span className="cc-kpi__value">{tarefasConcluidas}</span>
            <span className="cc-kpi__label">Concluídas</span>
          </div>
          <div className="cc-kpi__card blue">
            <span className="cc-kpi__value">{tarefasHoje - tarefasConcluidas}</span>
            <span className="cc-kpi__label">Pendentes</span>
          </div>
          <div className="cc-kpi__card amber">
            <span className="cc-kpi__value">{tarefasHoje}</span>
            <span className="cc-kpi__label">Total</span>
          </div>
        </div>
      </div>
      <div className="dcl-progress-wrap">
        <div className="dcl-progress-bar" style={{ width: `${percent}%` }} />
        <span className="dcl-progress-label">{percent}% concluído</span>
      </div>
    </section>
  );
}
