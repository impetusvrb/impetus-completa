/**
 * IMPETUS - Painel IA Central da Indústria
 * Exibe alertas unificados, status dos setores e insights consolidados
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, AlertTriangle, Layers, TrendingUp, ChevronRight } from 'lucide-react';
import './CentralAIPanel.css';

export default function CentralAIPanel({ data }) {
  const navigate = useNavigate();
  if (!data) return null;

  const { role_level, role_description, alerts, sectors, insights, integrated_sectors } = data;

  return (
    <div className="central-ai-panel">
      <div className="central-ai-panel__header">
        <div className="central-ai-panel__icon">
          <Brain size={24} />
        </div>
        <div>
          <h3>IA Central da Indústria</h3>
          <p className="central-ai-panel__role">{role_description}</p>
        </div>
      </div>

      {alerts && alerts.total > 0 && (
        <div className="central-ai-panel__alerts">
          <div className="central-ai-panel__alerts-header">
            <AlertTriangle size={18} />
            <span>{alerts.total} alerta(s)</span>
            {alerts.critical > 0 && (
              <span className="central-ai-panel__critical-badge">{alerts.critical} crítico(s)</span>
            )}
          </div>
          <ul className="central-ai-panel__alerts-list">
            {(alerts.items || [])
              .filter((a) => a != null && typeof a === 'object')
              .slice(0, 5)
              .map((a, aidx) => (
              <li
                key={a.id != null ? String(a.id) : `central-alert-${aidx}`}
                className={`central-ai-panel__alert-item severity-${a.severity || 'medium'}`}
              >
                <span className="sector-tag">{a.sector}</span>
                <strong>{a.title}</strong>
              </li>
            ))}
          </ul>
          {alerts.total > 5 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/app/cerebro-operacional')}
            >
              Ver todos <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {Array.isArray(sectors) && sectors.filter((s) => s && typeof s === 'object').length > 0 && (
        <div className="central-ai-panel__sectors">
          <h4><Layers size={16} /> Setores integrados</h4>
          <div className="central-ai-panel__sectors-grid">
            {sectors.filter((s) => s && typeof s === 'object').map((s, sidx) => (
              <div
                key={s.key != null ? String(s.key) : `sector-${sidx}`}
                className={`central-ai-panel__sector status-${s.status || 'unknown'}`}
              >
                <span className="sector-name">{s.name}</span>
                <span className="sector-status">{s.status === 'ok' ? '✓' : s.status === 'alert' ? '!' : '?'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(insights) && insights.filter((i) => i && typeof i === 'object').length > 0 && (
        <div className="central-ai-panel__insights">
          <h4><TrendingUp size={16} /> Insights</h4>
          <ul>
            {insights
              .filter((i) => i && typeof i === 'object')
              .slice(0, 3)
              .map((i, idx) => (
              <li key={idx}>
                <strong>{i.title}</strong>
                <p>{i.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {integrated_sectors?.length > 0 && (
        <p className="central-ai-panel__footer">
          {integrated_sectors.length} setor(es) conectado(s): {integrated_sectors.join(', ')}
        </p>
      )}
    </div>
  );
}
