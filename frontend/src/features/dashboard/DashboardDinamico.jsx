/**
 * DASHBOARD INTELIGENTE DINÂMICO
 * Layout gerado pelo backend conforme perfil do usuário (cargo, departamento, permissões, hierarquia).
 * Monta automaticamente os widgets permitidos para o usuário.
 */
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { dashboard } from '../../services/api';
import { getWidgetComponent } from './widgets';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import './DashboardDinamico.css';

export default function DashboardDinamico() {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const enableDynamicDashboard = import.meta.env.VITE_ENABLE_DYNAMIC_DASHBOARD !== 'false';

  /** Layout padrão quando a API falha (rota inexistente, sem dados ou erro no servidor) */
  const getFallbackLayout = () => ({
    widgets: [
      { id: 'smart_summary', type: 'kpi', label: 'Resumo Inteligente', position: { width: 2 } },
      { id: 'indicators', type: 'kpi', label: 'Indicadores', position: { width: 2 } },
      { id: 'alerts_panel', type: 'alerts', label: 'Painel de Alertas', position: { width: 2 } },
      { id: 'trend_chart', type: 'analytics', label: 'Tendências', position: { width: 1 } },
      { id: 'recent_interactions', type: 'kpi', label: 'Interações Recentes', position: { width: 1 } }
    ],
    layout: { grid: 'responsive', columns: 4 },
    userProfile: {},
    alerts: [],
    fromFallback: true
  });

  const loadLayout = () => {
    setLoading(true);
    setError(null);
    dashboard.getDynamicLayout()
      .then((r) => {
        const data = r?.data;
        if (data && data.ok !== false && Array.isArray(data.widgets)) {
          setLayout({
            widgets: data.widgets,
            layout: data.layout || { grid: 'responsive', columns: 4 },
            userProfile: data.userProfile || {},
            alerts: data.alerts || [],
            version: data.version,
            generatedAt: data.generatedAt,
            ttl: data.ttl,
            fromFallback: false
          });
        } else {
          setLayout({ widgets: data?.widgets || [], layout: { grid: 'responsive', columns: 4 }, userProfile: data?.userProfile || {}, alerts: data?.alerts || [], fromFallback: false });
        }
      })
      .catch((e) => {
        setError(e);
        setLayout(getFallbackLayout());
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!enableDynamicDashboard) {
      setLayout({ widgets: [], layout: { columns: 4 }, userProfile: {}, alerts: [] });
      setLoading(false);
      return;
    }
    loadLayout();
  }, [enableDynamicDashboard]);

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-dinamico dashboard-dinamico--loading">
          <div className="dashboard-dinamico__spinner" />
          <p>Carregando seu dashboard personalizado...</p>
        </div>
      </Layout>
    );
  }

  const { widgets = [], userProfile = {}, alerts: globalAlerts = [], fromFallback } = layout || {};

  if (error && (!layout || (layout.widgets && layout.widgets.length === 0))) {
    return (
      <Layout>
        <div className="dashboard-dinamico dashboard-dinamico--error">
          <AlertTriangle size={48} />
          <p>Não foi possível carregar o dashboard.</p>
          <p className="dashboard-dinamico__error-hint">
            {error?.response?.status === 404
              ? 'A rota do dashboard dinâmico não está disponível no servidor.'
              : error?.response?.status === 401
                ? 'Faça login novamente.'
                : 'Pode ser falha de rede, servidor ou falta de dados do perfil.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={loadLayout}>
            <RefreshCw size={18} /> Tentar novamente
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-dinamico">
        {fromFallback && error && (
          <div className="dashboard-dinamico__fallback-banner" role="alert">
            <AlertTriangle size={20} />
            <span>Dashboard em modo simplificado. A personalização por perfil não está disponível.</span>
            <button type="button" className="dashboard-dinamico__fallback-retry" onClick={loadLayout}>
              Tentar novamente
            </button>
          </div>
        )}
        <header className="dashboard-dinamico__header">
          <h1 className="dashboard-dinamico__title">Centro de Inteligência Industrial</h1>
          <div className="dashboard-dinamico__profile">
            <p className="dashboard-dinamico__subtitle">
              <strong>Cargo:</strong> {userProfile?.cargo || userProfile?.role || '—'} &nbsp;|&nbsp;
              <strong>Função:</strong> {userProfile?.função || '—'} &nbsp;|&nbsp;
              <strong>Departamento:</strong> {userProfile?.departamento || '—'}
            </p>
            {(userProfile?.áreas_de_atuacao?.length > 0 || userProfile?.permissions?.length > 0) && (
              <p className="dashboard-dinamico__meta">
                <strong>Áreas de atuação:</strong> {(userProfile.áreas_de_atuacao || []).join(', ') || '—'}
                {userProfile.permissions?.length > 0 && (
                  <> &nbsp;|&nbsp; <strong>Permissões:</strong> {(userProfile.permissions || []).slice(0, 5).join(', ')}{(userProfile.permissions?.length > 5 ? '…' : '')}</>
                )}
              </p>
            )}
            {(userProfile?.nível_hierárquico != null || (userProfile?.módulos_utilizados_anteriormente?.length > 0)) && (
              <p className="dashboard-dinamico__meta">
                {userProfile?.nível_hierárquico != null && <><strong>Nível hierárquico:</strong> {userProfile.nível_hierárquico} &nbsp;|&nbsp; </>}
                {userProfile?.módulos_utilizados_anteriormente?.length > 0 && (
                  <><strong>Módulos utilizados anteriormente:</strong> {(userProfile.módulos_utilizados_anteriormente || []).join(', ')}</>
                )}
              </p>
            )}
          </div>
        </header>

        {globalAlerts.length > 0 && (
          <section className="dashboard-dinamico__alerts-strip" aria-label="Alertas">
            <ul className="dashboard-dinamico__alerts-list">
              {globalAlerts.map((a, i) => (
                <li key={i} className={`dashboard-dinamico__alert-item dashboard-dinamico__alert-item--${(a.severity || 'medium').toLowerCase()}`}>
                  <span className="dashboard-dinamico__alert-type">{a.type}</span>
                  <span className="dashboard-dinamico__alert-message">{a.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!enableDynamicDashboard ? (
          <div className="dashboard-dinamico__empty">
            <p>Dashboard dinâmico desativado (feature flag).</p>
            <p className="dashboard-dinamico__empty-hint">Ative VITE_ENABLE_DYNAMIC_DASHBOARD para usar o Centro de Inteligência Industrial.</p>
          </div>
        ) : widgets.length === 0 ? (
          <div className="dashboard-dinamico__empty">
            <p>Nenhum widget disponível para seu perfil no momento.</p>
            <p className="dashboard-dinamico__empty-hint">Entre em contato com o administrador para ajustar permissões.</p>
          </div>
        ) : (
          <div className="dashboard-dinamico__grid">
            {widgets.map((w, index) => {
              const Component = getWidgetComponent(w.id);
              const position = w.position || {};
              const width = position.width ?? (w.size?.w ? Math.min(Math.ceil((w.size.w || 6) / 3), 2) : 1);
              const span = Math.min(Math.max(1, width), 2);
              return (
                <div
                  key={w.id + (w.position?.row ?? index)}
                  className="dashboard-dinamico__cell"
                  data-span={span === 2 ? '2' : undefined}
                  style={{
                    gridColumn: span === 2 ? 'span 2' : undefined,
                    gridRow: position.height ? `span ${position.height}` : undefined
                  }}
                >
                  <Component id={w.id} type={w.type} label={w.label} defaultSettings={w.defaultSettings || {}} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
