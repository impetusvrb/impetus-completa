/**
 * Widget genérico para Centros Inteligentes (Previsão, Cérebro Operacional, Custos, Mapa, etc.)
 * Exibe card com título e link para a página completa do centro.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTES = {
  center_predictions: '/app/centro-previsao-operacional',
  industrial_map: '/app/centro-operacoes-industrial',
  cost_center: '/app/centro-custos-industriais',
  leak_map: '/app/mapa-vazamento-financeiro',
  central_ai: '/app/chatbot'
};

export default function CenterWidget({ id, label }) {
  const navigate = useNavigate();
  const path = ROUTES[id] || '#';

  return (
    <div className="dashboard-widget dashboard-widget--center">
      <div className="dashboard-widget__header">
        <h3 className="dashboard-widget__title">{label}</h3>
        <button
          type="button"
          className="dashboard-widget__action"
          onClick={() => path !== '#' && navigate(path)}
          aria-label={`Abrir ${label}`}
        >
          Abrir <ChevronRight size={18} />
        </button>
      </div>
      <p className="dashboard-widget__hint">
        Clique em &quot;Abrir&quot; para acessar análises, previsões e configurações deste centro.
      </p>
    </div>
  );
}
