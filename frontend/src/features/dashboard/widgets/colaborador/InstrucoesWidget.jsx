/**
 * Widget Instruções — Dashboard Colaborador Dinâmico
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';

export default function InstrucoesWidget({ widgetClass = 'dcl-widget', btnClass = 'dcl-btn' }) {
  const navigate = useNavigate();

  return (
    <section className={`cc-widget ${widgetClass}`}>
      <div className="cc-kpi__header">
        <FolderOpen size={20} />
        <span>Instruções</span>
      </div>
      <p className="cc-resumo__text">Manuais, POPs e procedimentos operacionais.</p>
      <button type="button" className={`${btnClass} ${btnClass}--secondary`} onClick={() => navigate('/app/biblioteca')}>
        Abrir Biblioteca
      </button>
    </section>
  );
}
