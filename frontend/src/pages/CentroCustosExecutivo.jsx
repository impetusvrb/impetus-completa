/**
 * IMPETUS - Centro de Custos Industriais (Painel Executivo)
 * CEO e Diretores: relatórios, gráficos e projeções financeiras
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboard } from '../services/api';
import {
  DollarSign, TrendingUp, AlertTriangle, RefreshCw, ArrowLeft,
  BarChart3, PieChart, Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';
import './CentroCustosExecutivo.css';

const PERIOD_LABELS = { hour: 'Hora', day: 'Dia', month: 'Mês', year: 'Ano' };
const COLORS = ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#4f46e5', '#0d9488'];

function formatMoney(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export default function CentroCustosExecutivo() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [byOrigin, setByOrigin] = useState([]);
  const [topLoss, setTopLoss] = useState(null);
  const [projectedLoss, setProjectedLoss] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [period, setPeriod] = useState('day');

  const load = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [sumRes, originRes, lossRes, projRes] = await Promise.all([
        dashboard.costs.getExecutiveSummary(period),
        dashboard.costs.getByOrigin(),
        dashboard.costs.getTopLoss(),
        dashboard.costs.getProjectedLoss(48)
      ]);
      if (sumRes?.data?.ok) setSummary(sumRes.data);
      if (originRes?.data?.ok) setByOrigin(originRes.data.by_origin || []);
      if (lossRes?.data?.ok) setTopLoss(lossRes.data);
      if (projRes?.data?.ok) setProjectedLoss(projRes.data);
    } catch (e) {
      if (e?.response?.status === 403) setAccessDenied(true);
      console.warn('Centro Custos load:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (accessDenied) {
    return (
      <Layout>
        <div className="centro-custos-executivo cce-forbidden">
          <div className="cce-forbidden-card">
            <AlertTriangle size={48} />
            <h2>Acesso restrito</h2>
            <p>O painel de custos industriais é voltado para CEO e Diretores.</p>
            <button className="cce-btn" onClick={() => navigate('/app')}>
              <ArrowLeft size={18} /> Voltar ao Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const op = summary?.operational || {};
  const impact = summary?.impact_from_events || {};
  const pieData = byOrigin
    .filter((o) => (parseFloat(o.hour) || 0) + (parseFloat(o.day) || 0) + (parseFloat(o.month) || 0) > 0)
    .map((o, i) => ({ name: o.label, value: parseFloat(o[period === 'day' ? 'day' : period === 'month' ? 'month' : 'hour']) || 0, color: COLORS[i % COLORS.length] }))
    .filter((d) => d.value > 0);

  const barData = byOrigin
    .filter((o) => (parseFloat(o.hour) || 0) > 0)
    .map((o) => ({ name: o.label, valor: parseFloat(o.hour) || 0 }));

  return (
    <Layout>
      <div className="centro-custos-executivo">
        <header className="cce-header">
          <div className="cce-title">
            <DollarSign size={28} />
            <div>
              <h1>Centro de Custos Industriais</h1>
              <span className="cce-subtitle">Visão financeira · Relatórios e projeções</span>
            </div>
          </div>
          <button className="cce-refresh" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} size={18} /> Atualizar
          </button>
        </header>

        {/* Cards resumo operacional */}
        <section className="cce-cards">
          <div className="cce-card">
            <Clock size={20} />
            <span className="cce-card-label">Custo/hora operacional</span>
            <span className="cce-card-value">{formatMoney(op.per_hour)}</span>
          </div>
          <div className="cce-card">
            <TrendingUp size={20} />
            <span className="cce-card-label">Custo/dia</span>
            <span className="cce-card-value">{formatMoney(op.per_day)}</span>
          </div>
          <div className="cce-card">
            <BarChart3 size={20} />
            <span className="cce-card-label">Custo/mês</span>
            <span className="cce-card-value">{formatMoney(op.per_month)}</span>
          </div>
          <div className="cce-card">
            <DollarSign size={20} />
            <span className="cce-card-label">Custo/ano</span>
            <span className="cce-card-value">{formatMoney(op.per_year)}</span>
          </div>
        </section>

        {/* Impacto de eventos */}
        <section className="cce-impact">
          <h3><AlertTriangle size={20} /> Impacto de eventos operacionais</h3>
          <div className="cce-impact-grid">
            <div className="cce-impact-item">
              <span className="cce-impact-val">{formatMoney(impact.last_hour)}</span>
              <small>Última hora</small>
            </div>
            <div className="cce-impact-item">
              <span className="cce-impact-val">{formatMoney(impact.last_day)}</span>
              <small>Últimas 24h</small>
            </div>
            <div className="cce-impact-item">
              <span className="cce-impact-val">{formatMoney(impact.last_7d)}</span>
              <small>Últimos 7 dias</small>
            </div>
          </div>
        </section>

        {/* Seletor período */}
        <section className="cce-period">
          <span>Visualizar por:</span>
          {['hour', 'day', 'month', 'year'].map((p) => (
            <button key={p} className={`cce-period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </section>

        {/* Gráficos */}
        <div className="cce-charts">
          <section className="cce-chart-box">
            <h3><BarChart3 size={20} /> Custos por origem (hora)</h3>
            {loading ? (
              <div className="cce-loading">Carregando...</div>
            ) : barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `R$${v / 1000}k` : `R$${v}`)} />
                  <Tooltip formatter={(v) => [formatMoney(v), 'Valor']} />
                  <Bar dataKey="valor" fill="#1e40af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="cce-empty">Cadastre itens no Centro de Custos (Admin) para ver os gráficos.</div>
            )}
          </section>

          <section className="cce-chart-box">
            <h3><PieChart size={20} /> Distribuição por categoria</h3>
            {loading ? (
              <div className="cce-loading">Carregando...</div>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RechartsPie>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="cce-empty">Sem dados de distribuição.</div>
            )}
          </section>
        </div>

        {/* Maior perda e projeção */}
        <div className="cce-grid-2">
          <section className="cce-loss">
            <h3>Maior perda (24h)</h3>
            {topLoss?.top_loss ? (
              <div className="cce-loss-detail">
                <div><strong>Causa:</strong> {topLoss.top_loss.cause}</div>
                <div><strong>Máquina/Linha:</strong> {topLoss.top_loss.machine || '-'}</div>
                <div><strong>Duração:</strong> {topLoss.top_loss.duration_hours?.toFixed(1)}h</div>
                <div><strong>Impacto:</strong> {formatMoney(topLoss.top_loss.impact)}</div>
              </div>
            ) : (
              <p className="cce-empty">Nenhum evento de perda registrado nas últimas 24h.</p>
            )}
          </section>

          <section className="cce-projection">
            <h3>Prejuízo projetado (48h)</h3>
            {projectedLoss ? (
              <div className="cce-proj-detail">
                <div className="cce-proj-val">{formatMoney(projectedLoss.projected_loss)}</div>
                <small>Baseline 24h: {formatMoney(projectedLoss.baseline_24h)}</small>
              </div>
            ) : (
              <p className="cce-empty">Carregando projeção...</p>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
