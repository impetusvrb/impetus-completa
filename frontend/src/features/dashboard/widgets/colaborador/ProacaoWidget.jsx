/**
 * Widget Pró-Ação — Dashboard Colaborador Dinâmico
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, ChevronRight } from 'lucide-react';

export default function ProacaoWidget({ data = {}, widgetClass = 'dcl-widget', btnClass = 'dcl-btn' }) {
  const navigate = useNavigate();
  const propostasAbertas = data.propostasAbertas ?? 0;

  return (
    <section className={`cc-widget ${widgetClass}`}>
      <div className="cc-kpi__header">
        <Lightbulb size={20} />
        <span>Pró-Ação</span>
      </div>
      <div className="dcl-card-acao">
        <span className="dcl-card-value">{propostasAbertas}</span>
        <span className="dcl-card-label">Propostas em aberto</span>
        <button type="button" className={`${btnClass} ${btnClass}--primary`} onClick={() => navigate('/app/proacao')}>
          Ver Pró-Ação <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
