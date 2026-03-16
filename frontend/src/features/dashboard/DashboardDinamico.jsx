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

  const loadLayout = () => {
    setLoading(true);
    setError(null);
    dashboard.getDynamicLayout()
      .then((r) => {
        const data = r?.data;
        if (data && data.ok !== false && Array.isArray(data.widgets)) {
          setLayout({
            widgets: data.widgets,
            layout: data.layout || { grid: 'responsive', columns: 12 },
            userProfile: data.userProfile || {},
            alerts: data.alerts || []
          });
        } else {
          setLayout({ widgets: [], layout: { grid: 'responsive', columns: 12 }, userProfile: data?.userProfile || {}, alerts: data?.alerts || [] });
        }
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLayout();
  }, []);

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

  if (error) {
    return (
      <Layout>
        <div className="dashboard-dinamico dashboard-dinamico--error">
          <AlertTriangle size={48} />
          <p>Não foi possível carregar o dashboard.</p>
          <button type="button" className="btn btn-primary" onClick={loadLayout}>
            <RefreshCw size={18} /> Tentar novamente
          </button>
        </div>
      </Layout>
    );
  }

  const { widgets = [], userProfile = {}, alerts: globalAlerts = [] } = layout || {};

  return (
    <Layout>
      <div className="dashboard-dinamico">
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

        {widgets.length === 0 ? (
          <div className="dashboard-dinamico__empty">
            <p>Nenhum widget disponível para seu perfil no momento.</p>
            <p className="dashboard-dinamico__empty-hint">Entre em contato com o administrador para ajustar permissões.</p>
          </div>
        ) : (
          <div className="dashboard-dinamico__grid">
            {widgets.map((w) => {
              const Component = getWidgetComponent(w.id);
              const size = w.size || { w: 6, h: 3 };
              return (
                <div
                  key={w.id}
                  className="dashboard-dinamico__cell"
                  style={{
                    gridColumn: `span ${Math.min(size.w || 6, 12)}`,
                    gridRow: `span ${size.h || 3}`
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
