/**
 * Widget Registro — Dashboard Colaborador Dinâmico
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit } from 'lucide-react';

export default function RegistroWidget({ widgetClass = 'dcl-widget', btnClass = 'dcl-btn' }) {
  const navigate = useNavigate();

  return (
    <section className={`cc-widget ${widgetClass}`}>
      <div className="cc-kpi__header">
        <FileEdit size={20} />
        <span>Registro</span>
      </div>
      <p className="cc-resumo__text">Registre atividades e ocorrências do turno.</p>
      <button type="button" className={`${btnClass} ${btnClass}--secondary`} onClick={() => navigate('/app/registro-inteligente')}>
        Registro Inteligente
      </button>
    </section>
  );
}
