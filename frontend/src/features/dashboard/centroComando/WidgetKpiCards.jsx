/**
 * Widget de KPIs — números no grid (Prompt v3 Parte 5).
 * Exibe dados no próprio card; sem link para outro módulo.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { dashboard, qualityIntelligence } from '../../../services/api';
import { fetchDashboardMeShared } from '../../../runtimeBoot/dashboardMeSharedStore';
import { BarChart3 } from 'lucide-react';
import {
  buildQualityCommandCenterKpiView,
  QUALITY_KPI_EMPTY
} from './qualityCommandCenterKpiAdapter';

function Skeleton() {
  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header"><div className="cc-kpi__skeleton-title" /></div>
      <div className="cc-kpi__grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="cc-kpi__card cc-kpi__skeleton" />
        ))}
      </div>
    </div>
  );
}

export default function WidgetKpiCards() {
  const [data, setData] = useState(null);
  const [meData, setMeData] = useState(null);
  const [ncrSummary, setNcrSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      dashboard.getSummary(),
      fetchDashboardMeShared(),
      qualityIntelligence.getNcrCapaSummary().catch(() => null)
    ])
      .then(([sRes, meRes, ncrRes]) => {
        const s = sRes?.data?.summary;
        if (s) setData(s);
        setMeData(meRes?.data || null);
        setNcrSummary(ncrRes?.data || null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const qualityView = useMemo(
    () =>
      buildQualityCommandCenterKpiView({
        meData,
        summary: data,
        ncrSummary
      }),
    [meData, data, ncrSummary]
  );

  if (loading) return <Skeleton />;
  if (error) {
    return (
      <div className="cc-widget cc-kpi cc-widget--error">
        <div className="cc-kpi__header">Indicadores</div>
        <p className="cc-widget__empty">Não foi possível carregar. Tente novamente.</p>
      </div>
    );
  }

  const inter = data?.operational_interactions?.total ?? 0;
  const insights = data?.ai_insights?.total ?? 0;
  const alertsCrit = data?.alerts?.critical ?? 0;

  const fourthSlot = qualityView
    ? {
        value: qualityView.widgetFourthSlot.unavailable ? QUALITY_KPI_EMPTY : qualityView.widgetFourthSlot.display,
        label: qualityView.widgetFourthSlot.label
      }
    : {
        value: data?.proposals?.total ?? 0,
        label: 'Propostas'
      };

  const items = [
    { value: inter, label: 'Interações' },
    { value: insights, label: 'Insights IA' },
    { value: alertsCrit, label: 'Alertas crít.' },
    { value: fourthSlot.value, label: fourthSlot.label }
  ];

  return (
    <div className="cc-widget cc-kpi">
      <div className="cc-kpi__header">
        <BarChart3 size={20} />
        <span>Indicadores</span>
      </div>
      <div className="cc-kpi__grid">
        {items.map((item, i) => (
            <div key={i} className="cc-kpi__card">
              <span className="cc-kpi__value">{item.value}</span>
              <span className="cc-kpi__label">{item.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
