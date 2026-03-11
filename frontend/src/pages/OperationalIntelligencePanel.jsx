/**
 * IMPETUS - Painel de Inteligência Operacional
 * Cérebro Operacional da Empresa: Produção, Manutenção, Gestão, Insights, Alertas, Timeline
 */
import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { dashboard } from '../services/api';
import {
  Brain,
  TrendingUp,
  Wrench,
  ClipboardList,
  AlertTriangle,
  Lightbulb,
  Clock,
  Map,
  RefreshCw,
  CheckCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import './OperationalIntelligencePanel.css';

export default function OperationalIntelligencePanel() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [mapa, setMapa] = useState(null);
  const [mapaOpen, setMapaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('resumo');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, insightsRes, alertsRes, timelineRes] = await Promise.all([
        dashboard.operationalBrain.getSummary(),
        dashboard.operationalBrain.getInsights({ limit: 20 }),
        dashboard.operationalBrain.getAlerts({ limit: 20 }),
        dashboard.operationalBrain.getTimeline({ limit: 30 })
      ]);
      if (sumRes?.data?.ok) {
        setSummary(sumRes.data);
        setInsights(sumRes.data.insights || insightsRes?.data?.insights || []);
        setAlerts(sumRes.data.alertas || alertsRes?.data?.alerts || []);
        setTimeline(sumRes.data.timeline || timelineRes?.data?.timeline || []);
      } else {
        setInsights(insightsRes?.data?.insights || []);
        setAlerts(alertsRes?.data?.alerts || []);
        setTimeline(timelineRes?.data?.timeline || []);
      }
      if (mapaOpen) {
        const mapRes = await dashboard.operationalBrain.getKnowledgeMap();
        if (mapRes?.data?.ok) setMapa(mapRes.data.mapa);
      }
    } catch (e) {
      console.warn('Operational panel load:', e);
    } finally {
      setLoading(false);
    }
  }, [mapaOpen]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  const handleResolveAlert = async (alertId) => {
    try {
      await dashboard.operationalBrain.resolveAlert(alertId);
      setAlerts((a) => a.filter((x) => x.id !== alertId));
    } catch {}
  };

  const handleMarkInsightRead = async (id) => {
    try {
      await dashboard.operationalBrain.markInsightRead(id);
      setInsights((i) => i.map((x) => (x.id === id ? { ...x, lido: true } : x)));
    } catch {}
  };

  const toggleMapa = () => {
    setMapaOpen((o) => !o);
    if (!mapa) {
      dashboard.operationalBrain.getKnowledgeMap().then((r) => {
        if (r?.data?.ok) setMapa(r.data.mapa);
      });
    }
  };

  const prod = summary?.producao || {};
  const manut = summary?.manutencao || {};
  const gest = summary?.gestao || {};

  return (
    <Layout>
      <div className="operational-intelligence-panel">
        <header className="oie-header">
          <div className="oie-header-title">
            <Brain className="oie-icon-brain" />
            <h1>Painel de Inteligência Operacional</h1>
          </div>
          <button className="oie-btn-refresh" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} size={18} />
            Atualizar
          </button>
        </header>

        {loading && !summary ? (
          <div className="oie-loading">Carregando...</div>
        ) : (
          <>
            <nav className="oie-tabs">
              {['resumo', 'insights', 'alertas', 'timeline'].map((t) => (
                <button
                  key={t}
                  className={`oie-tab ${activeTab === t ? 'active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t === 'resumo' && <TrendingUp size={16} />}
                  {t === 'insights' && <Lightbulb size={16} />}
                  {t === 'alertas' && <AlertTriangle size={16} />}
                  {t === 'timeline' && <Clock size={16} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </nav>

            {activeTab === 'resumo' && (
              <section className="oie-cards">
                <div className="oie-card producao">
                  <TrendingUp size={24} />
                  <h3>Produção</h3>
                  <p className="oie-card-val">{prod.paradas_24h ?? '-'}</p>
                  <small>Paradas 24h</small>
                  <p className="oie-card-val">{prod.reinicios_24h ?? '-'}</p>
                  <small>Reinícios 24h</small>
                </div>
                <div className="oie-card manutencao">
                  <Wrench size={24} />
                  <h3>Manutenção</h3>
                  <p className="oie-card-val">{manut.intervencoes_7d ?? '-'}</p>
                  <small>Intervenções 7 dias</small>
                  <p className="oie-card-val">{manut.pecas_trocadas ?? '-'}</p>
                  <small>Peças diferentes</small>
                </div>
                <div className="oie-card gestao">
                  <ClipboardList size={24} />
                  <h3>Gestão</h3>
                  <p className="oie-card-val">{gest.tarefas_abertas ?? '-'}</p>
                  <small>Tarefas abertas</small>
                  <p className="oie-card-val oie-warn">{gest.tarefas_atrasadas ?? '-'}</p>
                  <small>Tarefas atrasadas</small>
                </div>
              </section>
            )}

            {activeTab === 'insights' && (
              <section className="oie-list">
                <h3>Insights Automáticos</h3>
                {insights.length === 0 ? (
                  <p className="oie-empty">Nenhum insight gerado ainda.</p>
                ) : (
                  insights.map((i) => (
                    <div
                      key={i.id}
                      className={`oie-item insight ${i.lido ? 'read' : ''} severidade-${i.severidade || 'informativo'}`}
                    >
                      <div className="oie-item-header">
                        <span className="oie-item-badge">{i.categoria}</span>
                        {!i.lido && (
                          <button
                            className="oie-item-read"
                            onClick={() => handleMarkInsightRead(i.id)}
                            title="Marcar como lido"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                      <p className="oie-item-title">{i.titulo}</p>
                      {i.descricao && <p className="oie-item-desc">{i.descricao}</p>}
                      <small className="oie-item-meta">
                        {i.equipamento && `${i.equipamento} `}
                        {i.linha && `Linha ${i.linha} `}
                        {i.created_at && new Date(i.created_at).toLocaleString('pt-BR')}
                      </small>
                    </div>
                  ))
                )}
              </section>
            )}

            {activeTab === 'alertas' && (
              <section className="oie-list">
                <h3>Alertas Pendentes</h3>
                {alerts.length === 0 ? (
                  <p className="oie-empty">Nenhum alerta pendente.</p>
                ) : (
                  alerts.map((a) => (
                    <div key={a.id} className={`oie-item alerta severidade-${a.severidade || 'media'}`}>
                      <div className="oie-item-header">
                        <span className="oie-item-badge">{a.tipo_alerta}</span>
                        <button
                          className="oie-item-resolve"
                          onClick={() => handleResolveAlert(a.id)}
                          title="Resolver"
                        >
                          <CheckCircle size={18} />
                        </button>
                      </div>
                      <p className="oie-item-title">{a.titulo}</p>
                      {a.mensagem && <p className="oie-item-desc">{a.mensagem}</p>}
                    </div>
                  ))
                )}
              </section>
            )}

            {activeTab === 'timeline' && (
              <section className="oie-timeline">
                <h3>Linha do Tempo (24h)</h3>
                {timeline.length === 0 ? (
                  <p className="oie-empty">Nenhum evento recente.</p>
                ) : (
                  <ul>
                    {timeline.map((e, idx) => (
                      <li key={idx}>
                        <span className="oie-tl-time">
                          {e.data ? new Date(e.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                        <span className="oie-tl-event">{e.evento}</span>
                        {e.equipamento && <span className="oie-tl-equip">{e.equipamento}</span>}
                        {e.descricao && <span className="oie-tl-desc">{e.descricao}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className="oie-knowledge-map">
              <button className="oie-map-toggle" onClick={toggleMapa}>
                {mapaOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <Map size={20} />
                Mapa de Conhecimento da Empresa
              </button>
              {mapaOpen && mapa && (
                <div className="oie-map-content">
                  {mapa.linhas?.length ? (
                    <div className="oie-map-linhas">
                      {mapa.linhas.map((l) => (
                        <div key={l.id} className="oie-map-linha">
                          <strong>Linha {l.name || l.code}</strong>
                          {l.maquinas?.length ? (
                            <ul>
                              {l.maquinas.map((m) => (
                                <li key={m.id}>└ {m.name}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="oie-empty">Configure linhas e ativos na Base Estrutural.</p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
