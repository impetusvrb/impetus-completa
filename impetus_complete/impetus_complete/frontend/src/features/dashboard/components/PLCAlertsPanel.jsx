/**
 * Painel de alertas da IA de Coleta (PLC)
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { dashboard } from '../../../services/api';
import './PLCAlertsPanel.css';

export default function PLCAlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    dashboard.getPlcAlerts(false).then((r) => setAlerts(r.data?.alerts || [])).catch(() => setAlerts([])).finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = (id) => {
    dashboard.acknowledgePlcAlert(id).then(() => setAlerts((a) => a.filter((x) => x.id !== id))).catch(() => {});
  };

  if (loading) return <div className="plc-alerts-panel loading">Carregando...</div>;
  if (alerts.length === 0) return null;

  return (
    <div className="plc-alerts-panel">
      <header className="plc-alerts-header" onClick={() => setExpanded(!expanded)}>
        <AlertTriangle size={20} />
        <span>Alertas IA de Coleta ({alerts.length})</span>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </header>
      {expanded && (
        <ul className="plc-alerts-list">
          {alerts.map((a) => (
            <li key={a.id} className={`plc-alert plc-alert--${a.severity || 'medium'}`}>
              <div className="plc-alert__body">
                <strong>{a.equipment_id}</strong> {a.equipment_name && `· ${a.equipment_name}`}
                <p>{a.title}</p>
                {a.message && <span className="plc-alert__msg">{a.message}</span>}
              </div>
              <button type="button" className="plc-alert__ack" onClick={() => handleAcknowledge(a.id)} title="Reconhecer">
                <Check size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
