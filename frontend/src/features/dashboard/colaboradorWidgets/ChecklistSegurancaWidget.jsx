import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ChecklistSegurancaWidget() {
  const [showChecklist, setShowChecklist] = useState(false);

  return (
    <section className="cc-widget dcl-widget">
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
          <button type="button" className="dcl-btn dcl-btn--secondary" onClick={() => setShowChecklist(false)}>
            Fechar
          </button>
        </div>
      ) : (
        <button type="button" className="dcl-btn dcl-btn--primary" onClick={() => setShowChecklist(true)}>
          <CheckCircle2 size={18} /> Abrir Checklist
        </button>
      )}
    </section>
  );
}
