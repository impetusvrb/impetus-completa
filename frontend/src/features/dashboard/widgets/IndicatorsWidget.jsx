/**
 * Widget de Indicadores - KPIs rápidos do dashboard
 */
import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { dashboard } from '../../../services/api';

export default function IndicatorsWidget() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dashboard.getSummary()
      .then((r) => { if (!cancelled && r?.data?.summary) setSummary(r.data.summary); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="dashboard-widget dashboard-widget--indicators"><p className="dashboard-widget__loading">Carregando...</p></div>;

  const inter = summary?.operational_interactions || {};
  const insights = summary?.ai_insights || {};
  const points = summary?.monitored_points?.total ?? 0;
  const proposals = summary?.proposals?.total ?? 0;

  return (
    <div className="dashboard-widget dashboard-widget--indicators">
      <div className="dashboard-widget__header">
        <h3 className="dashboard-widget__title"><BarChart3 size={20} /> Indicadores</h3>
      </div>
      <div className="dashboard-widget__kpi-grid">
        <div className="dashboard-widget__kpi"><span className="dashboard-widget__kpi-value">{inter.total ?? 0}</span><span className="dashboard-widget__kpi-label">Interações</span></div>
        <div className="dashboard-widget__kpi"><span className="dashboard-widget__kpi-value">{insights.total ?? 0}</span><span className="dashboard-widget__kpi-label">Insights IA</span></div>
        <div className="dashboard-widget__kpi"><span className="dashboard-widget__kpi-value">{points}</span><span className="dashboard-widget__kpi-label">Pontos</span></div>
        <div className="dashboard-widget__kpi"><span className="dashboard-widget__kpi-value">{proposals}</span><span className="dashboard-widget__kpi-label">Propostas</span></div>
      </div>
    </div>
  );
}
