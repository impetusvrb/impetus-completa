/**
 * DASHBOARD INTELIGENTE DINÂMICO
 * Layout gerado pela API com base no perfil do usuário (cargo, departamento, hierarquia).
 * Substitui o modelo fixo por widgets dinâmicos - design preservado.
 */
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useDashboardMe } from '../../hooks/useDashboardMe';
import { useActivityLog } from '../../hooks/useActivityLog';
import { dashboard } from '../../services/api';
import { Settings2 } from 'lucide-react';
import DashboardCustomizerModal from './components/DashboardCustomizerModal';
import { WIDGET_COMPONENTS } from './widgets/widgetRegistry';
import './DashboardInteligente.css';

export default function IntelligentDynamicDashboard({ embed = false }) {
  const { payload: dashboardPayload, trackInteraction, refetch } = useDashboardMe({ enabled: true });
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const { log } = useActivityLog();

  useEffect(() => {
    let cancelled = false;
    async function fetchLayout() {
      try {
        const res = await dashboard.getDynamicLayout();
        if (!cancelled && res?.data) {
          const data = res.data;
          if (data.widgets?.length > 0) {
            setLayout(data);
          } else {
            setLayout({
              ...data,
              widgets: [
                { id: 'smart_summary', type: 'kpi', label: 'Resumo Inteligente' },
                { id: 'indicators', type: 'kpi', label: 'Indicadores' },
                { id: 'alerts_panel', type: 'alerts', label: 'Alertas' },
                { id: 'trend_chart', type: 'analytics', label: 'Tendências' },
                { id: 'recent_interactions', type: 'kpi', label: 'Interações' },
                { id: 'insights_list', type: 'analytics', label: 'Insights IA' }
              ]
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setLayout({
            widgets: [
              { id: 'smart_summary', type: 'kpi', label: 'Resumo Inteligente' },
              { id: 'indicators', type: 'kpi', label: 'Indicadores' },
              { id: 'alerts_panel', type: 'alerts', label: 'Alertas' },
              { id: 'trend_chart', type: 'analytics', label: 'Tendências' },
              { id: 'recent_interactions', type: 'kpi', label: 'Interações' },
              { id: 'insights_list', type: 'analytics', label: 'Insights IA' }
            ],
            layout: {},
            alerts: [],
            userProfile: {}
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLayout();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    log('view', 'dashboard_dinamico', null, { widgets: layout?.widgets?.length });
  }, [layout, log]);

  const areaLabel = dashboardPayload?.profile_label || layout?.userProfile?.department || 'Colaborador';

  const content = (
    <div className="dashboard-inteligente">
      <header className="dashboard-inteligente__header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-inteligente__area">
            Visão para {areaLabel}
          </p>
        </div>
        {!embed && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setCustomizerOpen(true)}
            title="Personalizar painel"
          >
            <Settings2 size={20} />
          </button>
        )}
      </header>

      {customizerOpen && (
        <DashboardCustomizerModal
          isOpen={customizerOpen}
          onClose={() => setCustomizerOpen(false)}
          payload={dashboardPayload}
          onSaved={refetch}
        />
      )}

      {loading && (
        <div className="dashboard-inteligente__empty">
          <p>Carregando layout personalizado...</p>
        </div>
      )}

      {error && !loading && (
        <div className="dashboard-inteligente__empty">
          <p>Usando layout padrão. Entre em contato com o suporte se o problema persistir.</p>
        </div>
      )}

      {!loading && layout?.widgets?.length > 0 && (
        <div className="dashboard-inteligente__widgets-grid">
          {layout.widgets.map((w) => {
            const Comp = WIDGET_COMPONENTS[w.id];
            if (!Comp) return null;
            const isInline = typeof Comp === 'function' && Comp.length === 0 && !Comp.prototype?.render;
            return (
              <div key={w.id} className="dashboard-inteligente__widget-wrap">
                {isInline ? (
                  Comp()
                ) : (
                  <Comp
                    widgetId={w.id}
                    label={w.label}
                    trackInteraction={trackInteraction}
                    payload={dashboardPayload}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && layout?.widgets?.length === 0 && !error && (
        <div className="dashboard-inteligente__empty">
          <p>Nenhum widget configurado para seu perfil. Entre em contato com o Diretor.</p>
        </div>
      )}
    </div>
  );

  if (embed) return content;
  return <Layout>{content}</Layout>;
}
