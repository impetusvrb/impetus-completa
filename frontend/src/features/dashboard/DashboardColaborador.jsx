/**
 * DASHBOARD DO COLABORADOR (Auxiliar de Produção)
 * Visão focada em tarefas, atividades do turno e acesso rápido às ferramentas.
 * Sem gráficos financeiros. Cores padrão semáforo (verde/amarelo/vermelho).
 * Padrão: cc-widget, metric-card, cc-kpi (igual DashboardOperador)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { CadastrarComIAWidget } from './widgets';
import { dashboard, proacao } from '../../services/api';
import {
  Target, Lightbulb, FolderOpen, FileEdit, AlertTriangle, CheckCircle2,
  ClipboardList, ChevronRight, Zap, MessageSquare, Bot
} from 'lucide-react';
import './DashboardColaborador.css';

export default function DashboardColaborador() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showChecklist, setShowChecklist] = useState(false);

  const [data, setData] = useState({
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
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const percentTarefas = data.tarefasHoje > 0 ? Math.round((data.tarefasConcluidas / data.tarefasHoje) * 100) : 0;
  const percentMeta = data.metaTurno > 0 ? Math.min(100, Math.round((data.realizado / data.metaTurno) * 100)) : 0;
  const statusClass = percentTarefas >= 80 ? 'green' : percentTarefas >= 50 ? 'amber' : 'red';

  if (loading) {
    return (
      <Layout>
        <div className="dcl-loading">
          <div className="dcl-spinner" />
          <p>Carregando dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dcl">
        <header className="dcl__header">
          <h1 className="dcl__title">Dashboard do Colaborador</h1>
          <p className="dcl__subtitle">Suas tarefas, atividades do turno e ferramentas</p>
        </header>

        <div className="dcl__grid">
          {/* 1. Status das Tarefas do Dia */}
          <section className="cc-widget dcl-widget" style={{ gridColumn: 'span 2' }}>
            <div className="cc-kpi__header">
              <ClipboardList size={20} />
              <span>Minhas Tarefas do Dia</span>
              <span className={`status-dot ${statusClass}`} />
            </div>
            <div className="dcl-status-row">
              <div className="cc-kpi__grid">
                <div className="cc-kpi__card green">
                  <span className="cc-kpi__value">{data.tarefasConcluidas}</span>
                  <span className="cc-kpi__label">Concluídas</span>
                </div>
                <div className="cc-kpi__card blue">
                  <span className="cc-kpi__value">{data.tarefasHoje - data.tarefasConcluidas}</span>
                  <span className="cc-kpi__label">Pendentes</span>
                </div>
                <div className="cc-kpi__card amber">
                  <span className="cc-kpi__value">{data.tarefasHoje}</span>
                  <span className="cc-kpi__label">Total</span>
                </div>
              </div>
            </div>
            <div className="dcl-progress-wrap">
              <div className="dcl-progress-bar" style={{ width: `${percentTarefas}%` }} />
              <span className="dcl-progress-label">{percentTarefas}% concluído</span>
            </div>
          </section>

          {/* 2. Pró-Ação */}
          <section className="cc-widget dcl-widget">
            <div className="cc-kpi__header">
              <Lightbulb size={20} />
              <span>Pró-Ação</span>
            </div>
            <div className="dcl-card-acao">
              <span className="dcl-card-value">{data.propostasAbertas}</span>
              <span className="dcl-card-label">Propostas em aberto</span>
              <button type="button" className="dcl-btn dcl-btn--primary" onClick={() => navigate('/app/proacao')}>
                Ver Pró-Ação <ChevronRight size={16} />
              </button>
            </div>
          </section>

          {/* 3. Meta vs Realizado (Turno) */}
          <section className="cc-widget dcl-widget">
            <div className="cc-kpi__header">
              <Target size={20} />
              <span>Atividades do Turno</span>
            </div>
            <div className="dcl-meta-grid">
              <div className="metric-card green">
                <span className="metric-label">Realizado</span>
                <span className="metric-value">{data.realizado}</span>
                <span className="metric-unit">un.</span>
              </div>
              <div className="metric-card blue">
                <span className="metric-label">Meta</span>
                <span className="metric-value">{data.metaTurno}</span>
                <span className="metric-unit">un.</span>
              </div>
            </div>
            <div className="dcl-progress-wrap">
              <div className="dcl-progress-bar" style={{ width: `${percentMeta}%` }} />
              <span className="dcl-progress-label">{percentMeta}% da meta</span>
            </div>
          </section>

          {/* 4. Próximas Atividades */}
          <section className="cc-widget dcl-widget" style={{ gridColumn: 'span 2' }}>
            <div className="cc-kpi__header">
              <ChevronRight size={20} />
              <span>Próximas Atividades</span>
            </div>
            {data.proximasAtividades?.length ? (
              <ul className="cc-alertas__list">
                {data.proximasAtividades.map((a) => (
                  <li key={a.id} className="cc-alertas__item cc-alertas__item--medium">
                    <span className="cc-alertas__msg">
                      <strong>{a.titulo}</strong> · {a.prioridade}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cc-widget__empty">Nenhuma atividade na fila.</p>
            )}
          </section>

          {/* 5. Cadastrar com IA */}
          <CadastrarComIAWidget widgetClass="dcl-widget" btnClass="dcl-btn" />

          {/* 6. Instruções */}
          <section className="cc-widget dcl-widget">
            <div className="cc-kpi__header">
              <FolderOpen size={20} />
              <span>Instruções</span>
            </div>
            <p className="cc-resumo__text">Manuais, POPs e procedimentos operacionais.</p>
            <button type="button" className="dcl-btn dcl-btn--secondary" onClick={() => navigate('/app/biblioteca')}>
              Abrir Biblioteca
            </button>
          </section>

          {/* 7. Registro de Atividades */}
          <section className="cc-widget dcl-widget">
            <div className="cc-kpi__header">
              <FileEdit size={20} />
              <span>Registro</span>
            </div>
            <p className="cc-resumo__text">Registre atividades e ocorrências do turno.</p>
            <button type="button" className="dcl-btn dcl-btn--secondary" onClick={() => navigate('/app/registro-inteligente')}>
              Registro Inteligente
            </button>
          </section>

          {/* 8. Alertas */}
          <section className="cc-widget dcl-widget">
            <div className="cc-kpi__header">
              <AlertTriangle size={20} />
              <span>Alertas</span>
            </div>
            {data.alertas?.length ? (
              <ul className="cc-alertas__list">
                {data.alertas.map((a, i) => (
                  <li key={i} className={`cc-alertas__item cc-alertas__item--${a.tipo || 'medium'}`}>
                    <span className="cc-alertas__msg">{a.msg}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cc-widget__empty">Nenhum alerta no momento.</p>
            )}
          </section>

          {/* 9. Checklist Segurança */}
          <section className="cc-widget dcl-widget">
            <div className="cc-kpi__header">
              <CheckCircle2 size={20} />
              <span>Checklist Segurança</span>
            </div>
            <p className="cc-resumo__text">Verificações antes de iniciar as atividades.</p>
            {showChecklist ? (
              <div className="dcl-checklist-preview">
                <ul>
                  <li>EPI conferido</li>
                  <li>Área de trabalho livre</li>
                  <li>Proteções em posição</li>
                  <li>Procedimento revisado</li>
                </ul>
                <button type="button" className="dcl-btn dcl-btn--secondary" onClick={() => setShowChecklist(false)}>
                  Fechar
                </button>
              </div>
            ) : (
              <button type="button" className="dcl-btn dcl-btn--primary" onClick={() => setShowChecklist(true)}>
                <CheckCircle2 size={18} /> Abrir Checklist
              </button>
            )}
          </section>

          {/* 10. Impetus IA e Chat */}
          <section className="cc-widget dcl-widget" style={{ gridColumn: 'span 2' }}>
            <div className="cc-kpi__header">
              <Bot size={20} />
              <span>Impetus IA e Chat</span>
            </div>
            <p className="cc-resumo__text">Assistente IA e chat com a equipe.</p>
            <div className="dcl-ia-chat-row">
              <button type="button" className="dcl-btn dcl-btn--primary" onClick={() => navigate('/app/chatbot')}>
                <Zap size={18} /> Impetus IA
              </button>
              <button type="button" className="dcl-btn dcl-btn--secondary" onClick={() => navigate('/chat')}>
                <MessageSquare size={18} /> Chat Impetus
              </button>
            </div>
          </section>
        </div>

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
