/**
 * Widget de Indicadores - KPIs rápidos do dashboard (spec v3: 6 estados)
 */
import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { dashboard } from '../../../services/api';
import WidgetSkeleton from '../components/WidgetSkeleton';
import { WIDGET_STATES } from '../components/WidgetState';

export default function IndicatorsWidget() {
  const [summary, setSummary] = useState(null);
  const [state, setState] = useState(WIDGET_STATES.loading);
  const [errorMsg, setErrorMsg] = useState('');

  const load = () => {
    setState(WIDGET_STATES.loading);
    setErrorMsg('');
    dashboard.getSummary()
      .then((r) => {
        const s = r?.data?.summary;
        if (s) setSummary(s);
        setState(s ? WIDGET_STATES.ready : WIDGET_STATES.empty);
      })
      .catch((e) => {
        setState(WIDGET_STATES.error);
        setErrorMsg(e?.response?.data?.error || 'Não foi possível carregar os indicadores.');
      });
  };

  useEffect(() => { load(); }, []);

  if (state === WIDGET_STATES.loading) return <WidgetSkeleton showKpiGrid lines={0} />;
  if (state === WIDGET_STATES.error) {
    return (
      <div className="dashboard-widget dashboard-widget--error">
        <div className="dashboard-widget__header"><h3 className="dashboard-widget__title"><BarChart3 size={20} /> Indicadores</h3></div>
        <p className="dashboard-widget__empty">{errorMsg}</p>
        <button type="button" className="dashboard-widget__action" onClick={load}>Tentar novamente</button>
      </div>
    );
  }
  if (state === WIDGET_STATES.empty) {
    return (
      <div className="dashboard-widget dashboard-widget--indicators">
        <div className="dashboard-widget__header"><h3 className="dashboard-widget__title"><BarChart3 size={20} /> Indicadores</h3></div>
        <p className="dashboard-widget__empty">Nenhum dado para este período.</p>
      </div>
    );
  }

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
