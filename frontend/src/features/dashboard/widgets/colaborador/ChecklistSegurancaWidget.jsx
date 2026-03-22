/**
 * Widget Checklist Segurança — Dashboard Colaborador Dinâmico
 */
import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ChecklistSegurancaWidget({ widgetClass = 'dcl-widget', btnClass = 'dcl-btn' }) {
  const [showChecklist, setShowChecklist] = useState(false);

  return (
    <section className={`cc-widget ${widgetClass}`}>
      <div className="cc-kpi__header">
        <CheckCircle2 size={20} />
        <span>Checklist Segurança</span>
      </div>
      <p className="cc-resumo__text">Verificações antes de iniciar as atividades.</p>
      {showChecklist ? (
        <div className="dcl-checklist-preview">
          <ul>
            <li>EPI conferido</li>
            <li>Área de trabalho livre</li>
            <li>Proteções em posição</li>
            <li>Procedimento revisado</li>
          </ul>
          <button type="button" className={`${btnClass} ${btnClass}--secondary`} onClick={() => setShowChecklist(false)}>
            Fechar
          </button>
        </div>
      ) : (
        <button type="button" className={`${btnClass} ${btnClass}--primary`} onClick={() => setShowChecklist(true)}>
          <CheckCircle2 size={18} /> Abrir Checklist
        </button>
      )}
    </section>
  );
}
