/**
 * DASHBOARD INTELIGENTE DINÂMICO DO COLABORADOR
 * Layout gerado pelo backend conforme perfil (cargo, função, departamento,
 * permissões, áreas de atuação, módulos utilizados, nível hierárquico).
 * Remove o modelo fixo e substitui por widgets gerados dinamicamente.
 * Design preservado: cc-widget, metric-card, cc-kpi (igual DashboardOperador).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { dashboard, proacao } from '../../services/api';
import { getColaboradorWidgetComponent } from './colaboradorWidgets';
import { AlertTriangle, RefreshCw, Zap, MessageSquare } from 'lucide-react';
import './DashboardColaborador.css';

const INITIAL_DATA = {
  tarefasHoje: 5,
  tarefasConcluidas: 2,
  propostasAbertas: 1,
  metaTurno: 800,
  realizado: 420,
  alertas: [],
  proximasAtividades: [
    { id: 1, titulo: 'Troca de ferramenta linha 2', prioridade: 'alta' },
    { id: 2, titulo: 'Verificação qualidade lote', prioridade: 'normal' }
  ]
};

export default function DashboardColaborador() {
  const navigate = useNavigate();
  const [layout, setLayout] = useState(null);
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLayout = useCallback(() => {
    setLoading(true);
    setError(null);
    dashboard
      .getColaboradorDynamicLayout()
      .then((r) => {
        const res = r?.data;
        if (res && res.ok !== false && Array.isArray(res.widgets)) {
          setLayout({
            widgets: res.widgets,
            layout: res.layout || { grid: 'responsive', columns: 4 },
            userProfile: res.userProfile || {},
            alerts: res.alerts || []
          });
        } else {
          setLayout({
            widgets: res?.widgets || [],
            layout: { grid: 'responsive', columns: 4 },
            userProfile: res?.userProfile || {},
            alerts: res?.alerts || []
          });
        }
      })
      .catch((e) => {
        setError(e);
        setLayout({
          widgets: [],
          layout: { columns: 4 },
          userProfile: {},
          alerts: []
        });
      });
  }, []);

  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [summaryRes, proacaoRes] = await Promise.all([
          dashboard.getSummary?.().catch(() => ({ data: {} })),
          proacao.list?.().catch(() => ({ data: { proposals: [] } }))
        ]);
        if (cancelled) return;
        const summary = summaryRes?.data?.summary ?? summaryRes?.data ?? {};
        const proposals = proacaoRes?.data?.proposals ?? [];
        const minhasPropostas = Array.isArray(proposals) ? proposals.filter((p) => !['rejected', 'approved', 'closed'].includes(p?.status)) : [];
        setData((prev) => ({
          ...prev,
          propostasAbertas: minhasPropostas.length,
          metaTurno: summary.operational_interactions?.total ?? prev.metaTurno,
          realizado: summary.operational_interactions?.total ?? prev.realizado
        }));
      } catch {
        if (!cancelled) setData((d) => d);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const { widgets = [], userProfile = {}, alerts: globalAlerts = [] } = layout || {};

  if (loading) {
    return (
      <Layout>
        <div className="dcl-loading">
          <div className="dcl-spinner" />
          <p>Carregando seu dashboard personalizado...</p>
        </div>
      </Layout>
    );
  }

  if (error && (!layout || !layout.widgets?.length)) {
    return (
      <Layout>
        <div className="dcl-loading">
          <AlertTriangle size={48} color="var(--color-warning)" />
          <p>Não foi possível carregar o dashboard.</p>
          <button type="button" className="dcl-btn dcl-btn--primary" onClick={loadLayout}>
            <RefreshCw size={18} /> Tentar novamente
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dcl">
        <header className="dcl__header">
          <h1 className="dcl__title">Dashboard Inteligente</h1>
          <p className="dcl__subtitle">
            Suas tarefas, atividades do turno e ferramentas
            {userProfile?.cargo || userProfile?.departamento ? (
              <> · {userProfile.cargo || userProfile.departamento}</>
            ) : null}
          </p>
        </header>

        {globalAlerts.length > 0 && (
          <ul className="cc-alertas__list" style={{ marginBottom: '1rem' }}>
            {globalAlerts.map((a, i) => (
              <li key={i} className={`cc-alertas__item cc-alertas__item--${(a.severity || 'medium').toLowerCase()}`}>
                <span className="cc-alertas__msg">{a.message || a.msg}</span>
              </li>
            ))}
          </ul>
        )}

        {widgets.length === 0 ? (
          <p className="cc-widget__empty">Nenhum widget disponível para seu perfil no momento.</p>
        ) : (
          <div className="dcl__grid">
            {widgets.map((w, index) => {
              const Component = getColaboradorWidgetComponent(w.id);
              if (!Component) return null;
              const span = (w.position?.width ?? 1) === 2 ? 2 : 1;
              const extraProps = w.id === 'cadastrar_com_ia' ? { widgetClass: 'dcl-widget', btnClass: 'dcl-btn' } : { data };
              return (
                <div
                  key={`${w.id}-${index}`}
                  style={span === 2 ? { gridColumn: 'span 2' } : undefined}
                >
                  <Component {...extraProps} />
                </div>
              );
            })}
          </div>
        )}

        <div className="dcl-footer">
          <button type="button" className="dcl-btn dcl-btn--secondary" onClick={() => navigate('/app/chatbot')}>
            <Zap size={18} /> Impetus IA
          </button>
          <button type="button" className="dcl-btn dcl-btn--secondary" onClick={() => navigate('/chat')}>
            <MessageSquare size={18} /> Chat Impetus
          </button>
        </div>
      </div>
    </Layout>
  );
}
