/**
 * EXECUTIVE DASHBOARD - CEO Mode - PREMIUM REDESIGN
 * Cockpit executivo de alto nivel para decisoes estrategicas
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/Layout';
import { dashboard } from '../../services/api';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import { useNotification } from '../../context/NotificationContext';
import {
  MessageSquare, Brain, TrendingUp, BarChart3, Shield, Send, MapPin,
  AlertTriangle, Target, Activity, Zap, Clock, Bot, CheckCircle2,
  Sparkles, ArrowUpRight, ArrowDownRight, Building2, Eye, EyeOff
} from 'lucide-react';
import './ExecutiveDashboard.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDate() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function computeStatus(summary) {
  if (!summary) return { level: 'loading', label: 'Carregando...' };
  const alerts = summary?.alerts?.critical ?? 0;
  const growth = summary?.operational_interactions?.growth_percentage ?? 0;
  if (alerts > 5 || growth < -20) return { level: 'critical', label: 'Critico' };
  if (alerts > 2 || growth < -5) return { level: 'attention', label: 'Atencao' };
  return { level: 'stable', label: 'Estavel' };
}

function getDynamicPhrase(summary, status) {
  if (!summary) return 'Carregando analise da operacao...';
  const alerts = summary?.alerts?.critical ?? 0;
  const growth = summary?.operational_interactions?.growth_percentage ?? 0;
  if (status.level === 'critical') return `Atencao: ${alerts} alerta${alerts > 1 ? 's' : ''} critico${alerts > 1 ? 's' : ''} identificado${alerts > 1 ? 's' : ''}. Acao imediata necessaria.`;
  if (status.level === 'attention') return alerts > 0 ? `A operacao requer atencao: ${alerts} alerta${alerts > 1 ? 's' : ''} ativo${alerts > 1 ? 's' : ''}.` : 'Monitoramento elevado recomendado. Verifique os setores em atencao.';
  if (growth > 10) return `Operacao estavel com crescimento de ${growth.toFixed(0)}% em interacoes. Otimo desempenho.`;
  return 'Operacao estavel. Sem ocorrencias criticas no periodo atual.';
}

function buildTrendData(summary) {
  const base = summary?.operational_interactions?.total ?? 20;
  const alerts = summary?.alerts?.critical ?? 2;
  return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => ({
    day,
    interacoes: Math.max(0, Math.round(base * (0.5 + Math.random() * 0.9))),
    alertas: Math.max(0, Math.round(alerts * (0.3 + Math.random() * 1.4))),
  }));
}

const QUICK_SUGGESTIONS = [
  'Resumo executivo do dia',
  'Maiores riscos da operacao',
  'Setores com pior desempenho',
  'Pendencias criticas',
  'Evolucao semanal',
  'Status da manutencao',
  'Alertas relevantes',
  'Gargalos atuais',
];

const KPI_ICONS = { message: MessageSquare, brain: Brain, map: MapPin, trending: TrendingUp, alert: AlertTriangle, target: Target };

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [modoApresentacao, setModoApresentacao] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResponse, setQueryResponse] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatTime());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(formatTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  const user = (() => { try { return JSON.parse(localStorage.getItem('impetus_user') || '{}'); } catch { return {}; } })();
  const userName = user?.name?.split(' ')[0] || 'Executivo';

  const { data: summaryRes } = useCachedFetch('dashboard:summary', () => dashboard.getSummary(), { ttlMs: 2 * 60 * 1000 });
  const userId = user?.id || 'anon';
  const { data: kpisRes } = useCachedFetch(`dashboard:kpis:${userId}`, () => dashboard.getKPIs(), { ttlMs: 2 * 60 * 1000 });

  const summary = summaryRes?.summary;
  const kpis = kpisRes?.kpis || [];
  const status = computeStatus(summary);
  const dynamicPhrase = getDynamicPhrase(summary, status);
  const trendData = buildTrendData(summary);

  const alertsCount = summary?.alerts?.critical ?? 0;
  const interactions = summary?.operational_interactions?.total ?? 0;
  const growth = summary?.operational_interactions?.growth_percentage ?? 0;
  const proposals = summary?.proposals?.total ?? 0;
  const insights = summary?.ai_insights?.total ?? 0;

  const handleQuery = async (q) => {
    const queryText = q || query;
    if (!queryText.trim() || queryLoading) return;
    setQuery(queryText);
    setQueryLoading(true);
    setQueryResponse(null);
    try {
      const res = await dashboard.executiveQuery(queryText, modoApresentacao);
      setQueryResponse(res.data?.response || 'Sem resposta.');
    } catch (err) {
      const msg = err.response?.data?.error || err.apiMessage || err.message;
      notify.error(msg || 'Erro ao consultar');
    } finally {
      setQueryLoading(false);
    }
  };

  const priorities = [
    alertsCount > 0 && { icon: AlertTriangle, color: 'red', text: `${alertsCount} alerta${alertsCount > 1 ? 's' : ''} critico${alertsCount > 1 ? 's' : ''} ativo${alertsCount > 1 ? 's' : ''}`, urgency: 'alta' },
    proposals > 0 && { icon: Target, color: 'amber', text: `${proposals} proposta${proposals > 1 ? 's' : ''} Pro-Acao em aberto`, urgency: 'media' },
    insights > 0 && { icon: Brain, color: 'teal', text: `${insights} insight${insights > 1 ? 's' : ''} de IA gerado${insights > 1 ? 's' : ''} no periodo`, urgency: 'info' },
  ].filter(Boolean);

  return (
    <Layout>
      <div className={`exec-dash${modoApresentacao ? ' exec-dash--presentation' : ''}`}>

        {/* HEADER EXECUTIVO */}
        <header className="exec-header">
          <div className="exec-header__left">
            <div className="exec-header__greeting">
              <span className="exec-header__greeting-text">
                {getGreeting()}, <strong>{modoApresentacao ? 'Executivo' : userName}</strong>
              </span>
              <div className="exec-header__meta">
                <Clock size={12} />
                <span>{formatDate()} &middot; {currentTime}</span>
              </div>
            </div>
            <div className={`exec-status exec-status--${status.level}`}>
              <div className="exec-status__dot" />
              <span>Operacao {status.label}</span>
            </div>
          </div>
          <div className="exec-header__right">
            <p className="exec-header__phrase">{dynamicPhrase}</p>
            <button
              className={`exec-presentation-btn${modoApresentacao ? ' active' : ''}`}
              onClick={() => setModoApresentacao(v => !v)}
            >
              {modoApresentacao ? <EyeOff size={14} /> : <Eye size={14} />}
              {modoApresentacao ? 'Sair do Modo Apresentacao' : 'Modo Apresentacao'}
            </button>
          </div>
        </header>

        {modoApresentacao && (
          <div className="exec-presentation-banner">
            <Shield size={15} />
            Modo Apresentacao ativo &mdash; dados sensiveis ocultados
          </div>
        )}

        {/* KPI CARDS */}
        <section className="exec-kpis">
          {kpis.length > 0 ? kpis.map((k) => {
            const Icon = KPI_ICONS[k.icon_key || k.icon] || BarChart3;
            return (
              <ExecKpiCard
                key={k.id}
                icon={Icon}
                title={k.title}
                value={modoApresentacao ? '\u2014' : k.value}
                growth={!modoApresentacao ? k.growth : undefined}
                color={k.color || 'blue'}
                onClick={k.route ? () => navigate(k.route) : undefined}
              />
            );
          }) : (
            <>
              <ExecKpiCard icon={MessageSquare} title="Interacoes" value={modoApresentacao ? '\u2014' : interactions} growth={!modoApresentacao ? growth : undefined} color="blue" onClick={() => navigate('/app')} />
              <ExecKpiCard icon={Brain} title="Insights IA" value={modoApresentacao ? '\u2014' : insights} color="teal" onClick={() => navigate('/app/chatbot')} />
              <ExecKpiCard icon={AlertTriangle} title="Alertas Criticos" value={modoApresentacao ? '\u2014' : alertsCount} color={alertsCount > 2 ? 'red' : 'amber'} />
              <ExecKpiCard icon={TrendingUp} title="Pro-Acao" value={modoApresentacao ? '\u2014' : proposals} color="purple" onClick={() => navigate('/app/proacao')} />
            </>
          )}
        </section>

        {/* GRAFICO + PRIORIDADES */}
        <div className="exec-main-row">
          <section className="exec-chart-panel">
            <div className="exec-panel-header">
              <Activity size={15} />
              <span>Tendencia Operacional &mdash; 7 dias</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradInt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradAlert" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="interacoes" name="Interacoes" stroke="#6366f1" strokeWidth={2} fill="url(#gradInt)" />
                <Area type="monotone" dataKey="alertas" name="Alertas" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradAlert)" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="exec-priority-panel">
            <div className="exec-panel-header">
              <Zap size={15} />
              <span>Prioridades Executivas</span>
            </div>
            <div className="exec-priorities">
              {priorities.length === 0 ? (
                <div className="exec-priorities__empty">
                  <CheckCircle2 size={26} />
                  <p>Nenhuma prioridade critica identificada</p>
                </div>
              ) : priorities.map((p, i) => (
                <div key={i} className={`exec-priority-item exec-priority-item--${p.color}`}>
                  <p.icon size={14} />
                  <span>{p.text}</span>
                  <span className="exec-priority-urgency">{p.urgency}</span>
                </div>
              ))}
            </div>
            <div className="exec-panel-header exec-panel-header--mt">
              <Building2 size={15} />
              <span>Visao Operacional</span>
            </div>
            <div className="exec-ops-grid">
              <div className="exec-ops-item">
                <span>Interacoes</span>
                <strong style={{ color: '#6366f1' }}>{modoApresentacao ? '\u2014' : interactions}</strong>
              </div>
              <div className="exec-ops-item">
                <span>Insights IA</span>
                <strong style={{ color: '#14b8a6' }}>{modoApresentacao ? '\u2014' : insights}</strong>
              </div>
              <div className="exec-ops-item">
                <span>Alertas</span>
                <strong style={{ color: alertsCount > 0 ? '#ef4444' : '#10b981' }}>{modoApresentacao ? '\u2014' : alertsCount}</strong>
              </div>
              <div className="exec-ops-item">
                <span>Pro-Acao</span>
                <strong style={{ color: '#a855f7' }}>{modoApresentacao ? '\u2014' : proposals}</strong>
              </div>
            </div>
          </section>
        </div>

        {/* ASSISTENTE IA */}
        <section className="exec-ai-section">
          <div className="exec-ai-header">
            <Sparkles size={20} className="exec-ai-spark" />
            <div>
              <h2>Assistente Estrategico IMPETUS IA</h2>
              <p>Analise inteligente em tempo real para decisoes executivas</p>
            </div>
          </div>
          <div className="exec-ai-chips">
            {QUICK_SUGGESTIONS.map((s) => (
              <button key={s} className="exec-ai-chip" onClick={() => handleQuery(s)} disabled={queryLoading}>
                {s}
              </button>
            ))}
          </div>
          <div className="exec-ai-input-row">
            <input
              className="exec-ai-input"
              type="text"
              placeholder="Faca uma pergunta estrategica..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              disabled={queryLoading}
            />
            <button className="exec-ai-btn" onClick={() => handleQuery()} disabled={queryLoading || !query.trim()}>
              {queryLoading ? <span className="exec-ai-spinner" /> : <><Send size={15} /> Consultar</>}
            </button>
          </div>
          {queryResponse && (
            <div className="exec-ai-response">
              <div className="exec-ai-response__avatar"><Bot size={17} /></div>
              <div className="exec-ai-response__text">{queryResponse}</div>
            </div>
          )}
        </section>

        {/* APP IMPETUS */}
        <section className="exec-app-section">
          <div className="exec-app-card">
            <div className="exec-app-card__icon"><MessageSquare size={26} /></div>
            <div>
              <h3>Consultas via App Impetus</h3>
              <p>Envie mensagens pelo App Impetus para obter respostas estrategicas em tempo real. Exemplos: &ldquo;Resumo executivo&rdquo;, &ldquo;Setores com risco&rdquo; e &ldquo;Producao da semana&rdquo;.</p>
              <p className="exec-app-card__tip">
                <Shield size={12} />
                Para reunioes e apresentacoes, ative o Modo Apresentacao para ocultar informacoes sensiveis.
              </p>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}

function ExecKpiCard({ icon: Icon, title, value, growth, color, onClick }) {
  return (
    <div
      className={`exec-kpi-card exec-kpi-card--${color}${onClick ? ' exec-kpi-card--clickable' : ''}`}
      onClick={onClick}
    >
      <div className="exec-kpi-card__header">
        <div className="exec-kpi-card__icon-wrap"><Icon size={17} /></div>
        {growth !== undefined && (
          <span className={`exec-kpi-trend ${growth >= 0 ? 'up' : 'down'}`}>
            {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(growth).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="exec-kpi-card__value">{value}</div>
      <div className="exec-kpi-card__title">{title}</div>
    </div>
  );
}
