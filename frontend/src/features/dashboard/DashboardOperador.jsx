/**
 * DASHBOARD DO OPERADOR
 * Métricas de produtividade em tempo real, status de máquinas e tarefas.
 * Sem gráficos financeiros. Cores padrão semáforo (verde/amarelo/vermelho).
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { CadastrarComIAWidget } from './widgets';
import { dashboard } from '../../services/api';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Package, Target,
  Cpu, ClipboardCheck, ChevronRight, Zap, Shield, MessageSquare, Bot
} from 'lucide-react';
import './DashboardOperador.css';

const STATUS_LABELS = { running: 'Rodando', stopped: 'Parado', setup: 'Setup', maintenance: 'Manutenção' };
const PARADA_MOTIVOS = ['Falta de material', 'Quebra', 'Setup', 'Manutenção', 'Troca de ferramenta', 'Aguardando qualidade', 'Outro'];

export default function DashboardOperador() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedParada, setSelectedParada] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);

  // Dados em tempo real (mock/API - substituir por endpoints reais quando disponíveis)
  const [data, setData] = useState({
    machineStatus: 'running',
    metaTurno: 1200,
    realizado: 847,
    goodCount: 830,
    scrapCount: 17,
    cicloAtual: 28,
    cicloPadrao: 30,
    oee: 82,
    downtimeAtual: 0,
    downtimeAcumulado: 12,
    opAtual: { numero: 'OP-2024-0042', produto: 'Peça X', quantidade: 5000 },
    tempoRestante: '02:15:30',
    proximaOP: { numero: 'OP-2024-0043', produto: 'Peça Y', quantidade: 3200 },
    alertas: []
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [statusRes, machinesRes] = await Promise.all([
          dashboard.industrial?.getStatus?.().catch(() => ({ data: {} })),
          dashboard.industrial?.getMachines?.().catch(() => ({ data: { machines: [] } }))
        ]);
        if (cancelled) return;
        const st = statusRes?.data ?? {};
        setMachines(st.profiles || machinesRes?.data?.machines || []);
        setEvents(st.events || []);
        if (st.events?.length) {
          setData((prev) => ({
            ...prev,
            alertas: st.events.slice(0, 5).map((e) => ({
              tipo: e.severity === 'critical' ? 'critical' : 'high',
              msg: e.description || e.event_type || 'Alerta',
              hora: e.created_at
            }))
          }));
        }
      } catch {
        if (!cancelled) setData((d) => ({ ...d, machineStatus: 'stopped' }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const statusClass = data.machineStatus === 'running' ? 'green' : data.machineStatus === 'setup' || data.machineStatus === 'maintenance' ? 'amber' : 'red';
  const percentMeta = data.metaTurno > 0 ? Math.min(100, Math.round((data.realizado / data.metaTurno) * 100)) : 0;

  if (loading) {
    return (
      <Layout>
        <div className="dop-loading">
          <div className="dop-spinner" />
          <p>Carregando dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dop">
        <header className="dop__header">
          <h1 className="dop__title">Dashboard do Operador</h1>
          <p className="dop__subtitle">Métricas em tempo real · Status de máquinas e tarefas</p>
        </header>

        <div className="dop__grid">
          {/* 1. Status da Máquina */}
          <section className="cc-widget dop-widget" style={{ gridColumn: 'span 2' }}>
            <div className="cc-kpi__header">
              <Cpu size={20} />
              <span>Status da Máquina</span>
              <span className={`status-dot ${statusClass}`} title={STATUS_LABELS[data.machineStatus] || data.machineStatus} />
            </div>
            <div className="dop-status-row">
              <div className={`dop-status-badge dop-status-badge--${statusClass}`}>
                {STATUS_LABELS[data.machineStatus] || 'Indisponível'}
              </div>
            </div>
          </section>

          {/* 2. Meta vs Realizado */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <Target size={20} />
              <span>Meta vs Realizado</span>
            </div>
            <div className="dop-meta-grid">
              <div className="metric-card green">
                <span className="metric-label">Realizado</span>
                <span className="metric-value">{data.realizado}</span>
                <span className="metric-unit">peças</span>
              </div>
              <div className="metric-card blue">
                <span className="metric-label">Meta turno</span>
                <span className="metric-value">{data.metaTurno}</span>
                <span className="metric-unit">peças</span>
              </div>
            </div>
            <div className="dop-progress-wrap">
              <div className="dop-progress-bar" style={{ width: `${percentMeta}%` }} />
              <span className="dop-progress-label">{percentMeta}% da meta</span>
            </div>
          </section>

          {/* 3. Contador Peças */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <Package size={20} />
              <span>Contador de Peças</span>
            </div>
            <div className="cc-kpi__grid cc-kpi__grid--3">
              <div className="cc-kpi__card green">
                <span className="cc-kpi__value">{data.goodCount}</span>
                <span className="cc-kpi__label">Peças boas</span>
              </div>
              <div className="cc-kpi__card red">
                <span className="cc-kpi__value">{data.scrapCount}</span>
                <span className="cc-kpi__label">Refugo</span>
              </div>
              <div className="cc-kpi__card blue">
                <span className="cc-kpi__value">{data.realizado}</span>
                <span className="cc-kpi__label">Total</span>
              </div>
            </div>
          </section>

          {/* 4. Ritmo de Produção (Ciclo) — verde se abaixo do padrão, vermelho se acima */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <Clock size={20} />
              <span>Ritmo de Produção</span>
            </div>
            <div className="dop-ciclo-grid">
              <div className={`metric-card ${data.cicloAtual <= data.cicloPadrao ? 'green' : 'red'}`}>
                <span className="metric-label">Ciclo atual</span>
                <span className="metric-value">{data.cicloAtual}</span>
                <span className="metric-unit">seg</span>
              </div>
              <div className="metric-card blue">
                <span className="metric-label">Padrão (ideal)</span>
                <span className="metric-value">{data.cicloPadrao}</span>
                <span className="metric-unit">seg</span>
              </div>
            </div>
            <p className="dop-ciclo-hint">
              {data.cicloAtual <= data.cicloPadrao ? 'Ritmo adequado ou acima do esperado' : 'Ritmo abaixo do padrão — verifique'}
            </p>
          </section>

          {/* 5. OEE */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <Activity size={20} />
              <span>OEE do Turno</span>
            </div>
            <div className="dop-oee-wrap">
              <div className={`dop-oee-value dop-oee-value--${data.oee >= 85 ? 'green' : data.oee >= 60 ? 'amber' : 'red'}`}>
                {data.oee}%
              </div>
            </div>
          </section>

          {/* 6. Tempo de Parada (Downtime) */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <AlertTriangle size={20} />
              <span>Tempo de Parada</span>
            </div>
            <div className="cc-kpi__grid">
              <div className="cc-kpi__card amber">
                <span className="cc-kpi__value">{data.downtimeAtual}</span>
                <span className="cc-kpi__label">Parada atual (min)</span>
              </div>
              <div className="cc-kpi__card red">
                <span className="cc-kpi__value">{data.downtimeAcumulado}</span>
                <span className="cc-kpi__label">Acumulado turno (min)</span>
              </div>
            </div>
            <div className="dop-parada-select">
              <label>Motivo da parada:</label>
              <select value={selectedParada} onChange={(e) => setSelectedParada(e.target.value)} className="dop-select">
                <option value="">Selecione...</option>
                {PARADA_MOTIVOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </section>

          {/* 7. OP Atual */}
          <section className="cc-widget dop-widget" style={{ gridColumn: 'span 2' }}>
            <div className="cc-kpi__header">
              <ClipboardCheck size={20} />
              <span>Ordem de Produção Atual</span>
            </div>
            <div className="dop-op-card">
              <div className="dop-op-main">
                <span className="dop-op-numero">{data.opAtual.numero}</span>
                <span className="dop-op-produto">{data.opAtual.produto}</span>
                <span className="dop-op-qtd">Qtd: {data.opAtual.quantidade}</span>
              </div>
              <div className="dop-op-tempo">
                <Clock size={16} />
                <span>Tempo restante: {data.tempoRestante}</span>
              </div>
            </div>
          </section>

          {/* 8. Alertas Visuais (quebra, temperatura, manutenção, qualidade) */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <AlertTriangle size={20} />
              <span>Alertas</span>
            </div>
            {data.alertas?.length ? (
              <ul className="cc-alertas__list">
                {data.alertas.map((a, i) => (
                  <li key={i} className={`cc-alertas__item cc-alertas__item--${a.tipo}`}>
                    <span className="cc-alertas__msg">{a.msg}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cc-widget__empty">Nenhum alerta no momento.</p>
            )}
          </section>

          {/* 9. Próxima Tarefa */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <ChevronRight size={20} />
              <span>Próxima Tarefa</span>
            </div>
            <div className="dop-proxima-op">
              <span className="dop-proxima-numero">{data.proximaOP.numero}</span>
              <span className="dop-proxima-produto">{data.proximaOP.produto}</span>
              <span className="dop-proxima-qtd">{data.proximaOP.quantidade} un.</span>
            </div>
          </section>

          {/* 10. Cadastrar com IA */}
          <CadastrarComIAWidget widgetClass="dop-widget" btnClass="dop-btn" />

          {/* 11. Checklist Segurança */}
          <section className="cc-widget dop-widget">
            <div className="cc-kpi__header">
              <Shield size={20} />
              <span>Checklist Segurança</span>
            </div>
            <p className="cc-resumo__text">Checklists obrigatórios antes de iniciar a máquina (Poka-Yoke).</p>
            {showChecklist ? (
              <div className="dop-checklist-preview">
                <ul>
                  <li>EPI conferido</li>
                  <li>Área de trabalho livre</li>
                  <li>Proteções em posição</li>
                  <li>Painel sem avisos</li>
                </ul>
                <button type="button" className="dop-btn dop-btn--secondary" onClick={() => setShowChecklist(false)}>
                  Fechar
                </button>
              </div>
            ) : (
              <button type="button" className="dop-btn dop-btn--primary" onClick={() => setShowChecklist(true)}>
                <CheckCircle2 size={18} /> Abrir Checklist
              </button>
            )}
          </section>

          {/* 12. Impetus IA e Chat */}
          <section className="cc-widget dop-widget" style={{ gridColumn: 'span 2' }}>
            <div className="cc-kpi__header">
              <Bot size={20} />
              <span>Impetus IA e Chat</span>
            </div>
            <p className="cc-resumo__text">Assistente IA e chat com a equipe.</p>
            <div className="dop-ia-chat-row">
              <button type="button" className="dop-btn dop-btn--primary" onClick={() => navigate('/app/chatbot')}>
                <Zap size={18} /> Impetus IA
              </button>
              <button type="button" className="dop-btn dop-btn--secondary" onClick={() => navigate('/chat')}>
                <MessageSquare size={18} /> Chat Impetus
              </button>
            </div>
          </section>
        </div>

        <div className="dop-footer">
          <button type="button" className="dop-btn dop-btn--secondary" onClick={() => navigate('/app/chatbot')}>
            <Zap size={18} /> Impetus IA
          </button>
          <button type="button" className="dop-btn dop-btn--secondary" onClick={() => navigate('/chat')}>
            <MessageSquare size={18} /> Chat Impetus
          </button>
        </div>
      </div>
    </Layout>
  );
}
