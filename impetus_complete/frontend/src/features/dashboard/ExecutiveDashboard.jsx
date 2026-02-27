/**
 * DASHBOARD EXECUTIVO (CEO Mode)
 * Visão simplificada - sem menus técnicos
 * KPIs consolidados + Modo Apresentação
 * O sistema serve o CEO
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import MetricCard from '../../components/MetricCard';
import { dashboard } from '../../services/api';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import { useNotification } from '../../context/NotificationContext';
import { MessageSquare, Brain, TrendingUp, BarChart3, Shield, Send } from 'lucide-react';
import DashboardChatWidget from '../../components/DashboardChatWidget';
import './ExecutiveDashboard.css';

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [modoApresentacao, setModoApresentacao] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResponse, setQueryResponse] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const { data: summaryRes } = useCachedFetch('dashboard:summary', () => dashboard.getSummary(), {
    ttlMs: 2 * 60 * 1000
  });
  const summary = summaryRes?.summary;

  const handleQuery = async () => {
    if (!query.trim() || queryLoading) return;
    setQueryLoading(true);
    setQueryResponse(null);
    try {
      const res = await dashboard.executiveQuery(query, modoApresentacao);
      setQueryResponse(res.data?.response || 'Sem resposta.');
    } catch (err) {
      const msg = err.response?.data?.error || err.apiMessage || err.message;
      notify.error(msg || 'Erro ao consultar');
      if (msg?.includes('Verificação executiva pendente')) {
        setQueryResponse('Acesso liberado após envio do certificado IPC via WhatsApp.');
      }
    } finally {
      setQueryLoading(false);
    }
  };

  return (
    <Layout>
      <div className="executive-dashboard">
        <header className="executive-dashboard__header">
          <div>
            <h1 className="executive-dashboard__titulo">Visão Executiva</h1>
            <p className="executive-dashboard__subtitulo">
              KPIs consolidados · Acesso principal via WhatsApp
            </p>
          </div>
          <label className="executive-dashboard__modo-toggle">
            <input
              type="checkbox"
              checked={modoApresentacao}
              onChange={(e) => setModoApresentacao(e.target.checked)}
            />
            <span>Modo apresentação</span>
          </label>
        </header>

        {modoApresentacao && (
          <div className="executive-dashboard__modo-badge">
            <Shield size={18} />
            Modo apresentação ativo — dados sensíveis e valores financeiros detalhados ocultos
          </div>
        )}

        <section className="executive-dashboard__kpis">
          <h2>Indicadores Consolidados</h2>
          <div className="executive-dashboard__grid">
            <MetricCard
              icon={MessageSquare}
              title="Interações (semana)"
              value={summary?.operational_interactions?.total ?? 0}
              growth={!modoApresentacao ? (summary?.operational_interactions?.growth_percentage ?? 0) : undefined}
              color="blue"
              onClick={() => navigate('/app/operacional')}
            />
            <MetricCard
              icon={Brain}
              title="Insights IA"
              value={summary?.ai_insights?.total ?? 0}
              growth={!modoApresentacao ? (summary?.ai_insights?.growth_percentage ?? 0) : undefined}
              color="teal"
              onClick={() => navigate('/app/chatbot')}
            />
            <MetricCard
              icon={TrendingUp}
              title="Propostas Pró-Ação"
              value={summary?.proposals?.total ?? 0}
              color="purple"
              onClick={() => navigate('/app/proacao')}
            />
            <MetricCard
              icon={BarChart3}
              title="Pontos Monitorados"
              value={summary?.monitored_points?.total ?? 0}
              color="blue"
              onClick={() => navigate('/app/monitored-points')}
            />
          </div>
        </section>

        <section className="executive-dashboard__query">
          <h2>Consulta Estratégica</h2>
          <div className="executive-dashboard__query-box">
            <input
              type="text"
              placeholder="Ex: Resumo geral da indústria, Setores com risco..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              disabled={queryLoading}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleQuery}
              disabled={queryLoading || !query.trim()}
            >
              {queryLoading ? '...' : <><Send size={18} /> Consultar</>}
            </button>
          </div>
          {queryResponse && (
            <div className="executive-dashboard__response">
              {queryResponse}
            </div>
          )}
        </section>

        <section className="executive-dashboard__chat-section">
          <DashboardChatWidget greetingSummary={true} />
        </section>

        <section className="executive-dashboard__whatsapp">
          <div className="executive-dashboard__whatsapp-card">
            <MessageSquare size={32} />
            <div>
              <h3>Consultas via WhatsApp</h3>
              <p>
                Envie mensagens ao número cadastrado para obter respostas estratégicas em tempo real.
                Exemplos: &quot;Resumo geral&quot;, &quot;Setores com risco&quot;, &quot;Produção da semana&quot;.
              </p>
              <p className="executive-dashboard__whatsapp-tip">
                Para ocultar dados sensíveis em reuniões, inclua &quot;modo apresentação&quot; na mensagem.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
