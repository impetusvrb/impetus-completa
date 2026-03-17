/**
 * Painel de Alertas Inteligentes - exibe alertas gerados pela IA / operacionais
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { dashboard } from '../../../services/api';

export default function AlertsWidget() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      dashboard.operationalBrain?.getAlerts?.({ limit: 5 }).catch(() => ({ data: {} })),
      dashboard.getPlcAlerts?.(false).catch(() => ({ data: {} }))
    ]).then(([brainRes, plcRes]) => {
      if (cancelled) return;
      const list = [];
      const brainAlerts = brainRes?.data?.alerts || [];
      const plcAlerts = plcRes?.data?.alerts || plcRes?.data?.list || [];
      brainAlerts.slice(0, 3).forEach((a) => list.push({ type: 'operational', severity: a.severity || 'medium', message: a.description || a.title }));
      plcAlerts.slice(0, 3).forEach((a) => list.push({ type: 'plc', severity: a.severity || 'high', message: a.message || a.description }));
      setAlerts(list);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dashboard-widget dashboard-widget--alerts">
      <div className="dashboard-widget__header">
        <h3 className="dashboard-widget__title">Painel de Alertas</h3>
        <button type="button" className="dashboard-widget__action" onClick={() => navigate('/app/cerebro-operacional')}>
          Ver todos <ChevronRight size={18} />
        </button>
      </div>
      {loading ? (
        <p className="dashboard-widget__loading">Carregando alertas...</p>
      ) : alerts.length === 0 ? (
        <p className="dashboard-widget__empty">Nenhum alerta no momento.</p>
      ) : (
        <ul className="dashboard-widget__alert-list">
          {alerts.map((a, i) => (
            <li key={i} className={`dashboard-widget__alert-item dashboard-widget__alert-item--${a.severity || 'medium'}`}>
              <AlertTriangle size={16} />
              <span>{a.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
