/**
 * NexusIA — consumo unificado de tokens (visão administrador da empresa)
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Cpu, RefreshCw, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import Layout from '../components/Layout';
import { nexusIA } from '../services/api';
import './NexusIACustos.css';

function formatMoney(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatTokens(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return x.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export default function NexusIACustos() {
  const now = useMemo(() => new Date(), []);
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await nexusIA.getCustos({ ano, mes });
      setData(r.data);
    } catch (e) {
      if (e?.response?.status === 403) {
        setError('Acesso restrito ao administrador da empresa.');
      } else if (e?.response?.status === 503) {
        setError(e?.response?.data?.error || 'Módulo indisponível.');
      } else {
        setError(e?.apiMessage || e?.message || 'Erro ao carregar dados.');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ano, mes]);

  const chartData = useMemo(() => {
    if (!data?.diario?.length) return [];
    return data.diario.map((d) => ({
      dia: String(d.dia),
      tokens: Number(d.tokens) || 0
    }));
  }, [data]);

  return (
    <Layout>
      <div className="nexus-custos-page">
        <header className="nexus-custos-header">
          <div className="nexus-custos-title">
            <Cpu size={28} className="nexus-custos-icon" aria-hidden />
            <div>
              <h1>NexusIA — consumo de tokens</h1>
              <p className="nexus-custos-sub">
                Total unificado (voz, chat, IA e demais serviços). Valores conforme o plano da empresa.
              </p>
            </div>
          </div>
          <button type="button" className="nexus-custos-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Atualizar
          </button>
        </header>

        <div className="nexus-custos-filters">
          <label>
            Mês
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ano
            <input
              type="number"
              min={2024}
              max={2100}
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            />
          </label>
        </div>

        {error && (
          <div className="nexus-custos-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {loading && !data && !error && <p className="nexus-custos-loading">Carregando…</p>}

        {data?.ok && (
          <>
            <div className="nexus-custos-cards">
              <div className="nexus-custos-card">
                <span className="nexus-custos-card-label">Plano</span>
                <strong>{data.plano || '—'}</strong>
              </div>
              <div className="nexus-custos-card">
                <span className="nexus-custos-card-label">Mensalidade (referência)</span>
                <strong>{formatMoney(data.mensalidade)}</strong>
              </div>
              <div className="nexus-custos-card nexus-custos-card--highlight">
                <span className="nexus-custos-card-label">Tokens no período</span>
                <strong>{formatTokens(data.totalTokens)}</strong>
              </div>
              <div className="nexus-custos-card nexus-custos-card--accent">
                <span className="nexus-custos-card-label">Estimativa tokens (R$)</span>
                <strong>{formatMoney(data.valorTokens)}</strong>
              </div>
              <div className="nexus-custos-card">
                <span className="nexus-custos-card-label">Total mensal estimado</span>
                <strong>{formatMoney(data.totalFatura)}</strong>
              </div>
            </div>

            <section className="nexus-custos-chart-wrap">
              <h2>Consumo diário (tokens)</h2>
              {chartData.length === 0 ? (
                <p className="nexus-custos-empty">Sem registros neste período.</p>
              ) : (
                <div className="nexus-custos-chart">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="dia" tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--panel-bg, #1e293b)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8
                        }}
                        formatter={(v) => [formatTokens(v), 'Tokens']}
                        labelFormatter={(l) => `Dia ${l}`}
                      />
                      <Bar dataKey="tokens" fill="url(#nexusBarGrad)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="nexusBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
