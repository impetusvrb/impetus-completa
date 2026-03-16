/**
 * Widget genérico para itens que só precisam de título e link opcional
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTES = {
  trend_chart: '/app/operacional',
  recent_interactions: '/app/operacional',
  insights_list: '/app/insights',
  maintenance_cards: '/app',
  plc_alerts: '/app/cerebro-operacional'
};

export default function GenericWidget({ id, label }) {
  const navigate = useNavigate();
  const path = ROUTES[id];

  return (
    <div className="dashboard-widget dashboard-widget--generic">
      <div className="dashboard-widget__header">
        <h3 className="dashboard-widget__title">{label}</h3>
        {path && (
          <button type="button" className="dashboard-widget__action" onClick={() => navigate(path)}>
            Ver <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
