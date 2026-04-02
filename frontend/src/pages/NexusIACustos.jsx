/**
 * NexusIA — consumo de tokens + carteira de créditos (admin da empresa)
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cpu, RefreshCw, AlertCircle, Wallet, BarChart3, CreditCard, Pause, Play } from 'lucide-react';
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
import { nexusIA, nexusWallet } from '../services/api';
import { useNotification } from '../context/NotificationContext';
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

function formatCredits(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return x.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}

const IA_COST_TABLE = [
  {
    ia: 'ChatGPT (OpenAI)',
    funcao: 'Conversas, atendimento, voz e interação com usuário',
    custo: 'R$12,50 (input) / R$75,00 (output) por 1M tokens'
  },
  {
    ia: 'Gemini (Google)',
    funcao: 'Supervisão, automações e análise de dados',
    custo: 'R$0,40 a R$15,00 por 1M tokens'
  },
  {
    ia: 'Claude (Anthropic)',
    funcao: 'Relatórios, dashboards e análises avançadas',
    custo: 'R$25,00 (input) / R$125,00 (output) por 1M tokens'
  },
  {
    ia: 'Akool',
    funcao: 'Avatar em tempo real (vídeo com IA)',
    custo: 'R$1,00 a R$2,00 por minuto'
  }
];

export default function NexusIACustos() {
  const notify = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useMemo(() => new Date(), []);
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState(() => (searchParams.get('tab') === 'wallet' ? 'wallet' : 'tokens'));
  const [walletData, setWalletData] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletErr, setWalletErr] = useState('');
  const [thresholdInput, setThresholdInput] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('50');
  const [rateServico, setRateServico] = useState('chat');
  const [rateValue, setRateValue] = useState('1');

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

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletErr('');
    try {
      const r = await nexusWallet.getDashboard({ ledger_limit: 60 });
      setWalletData(r.data);
      const th = r.data?.wallet?.low_balance_threshold_credits;
      if (th != null) setThresholdInput(String(th));
    } catch (e) {
      setWalletErr(e?.apiMessage || e?.response?.data?.error || e?.message || 'Erro ao carregar carteira.');
      setWalletData(null);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [ano, mes]);

  useEffect(() => {
    if (view === 'wallet') loadWallet();
  }, [view, loadWallet]);

  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      notify.success('Pagamento recebido. Créditos podem levar alguns segundos a refletir.');
      searchParams.delete('stripe');
      setSearchParams(searchParams, { replace: true });
      loadWallet();
    }
  }, [searchParams, setSearchParams, notify, loadWallet]);

  const chartData = useMemo(() => {
    if (!data?.diario?.length) return [];
    return data.diario.map((d) => ({
      dia: String(d.dia),
      tokens: Number(d.tokens) || 0
    }));
  }, [data]);

  const setTab = (v) => {
    setView(v);
    const next = new URLSearchParams(searchParams);
    if (v === 'wallet') next.set('tab', 'wallet');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const allowedRateServices = useMemo(() => new Set(['chat', 'gemini', 'claude', 'akool']), []);
  const serviceLabel = useCallback((servico) => {
    const s = String(servico || '').toLowerCase();
    if (s === 'chat') return 'ChatGPT (OpenAI)';
    if (s === 'gemini') return 'Gemini (Google)';
    if (s === 'claude') return 'Claude (Anthropic)';
    if (s === 'akool') return 'Akool';
    return servico || '—';
  }, []);

  const serviceChart = useMemo(() => {
    const rows = walletData?.consumptionByServiceThisMonth || [];
    return rows
      .filter((r) => allowedRateServices.has(String(r.servico || '').toLowerCase()))
      .map((r) => ({
        name: serviceLabel(r.servico),
        credits: Number(r.credits_used) || 0
      }));
  }, [walletData, allowedRateServices, serviceLabel]);

  const filteredRateOptions = useMemo(
    () => [
      { servico: 'chat', label: serviceLabel('chat') },
      { servico: 'gemini', label: serviceLabel('gemini') },
      { servico: 'claude', label: serviceLabel('claude') },
      { servico: 'akool', label: serviceLabel('akool') }
    ],
    [serviceLabel]
  );

  const filteredCompanyRates = useMemo(() => {
    const rows = walletData?.ratesCompany || [];
    return rows.filter((r) => allowedRateServices.has(String(r.servico || '').toLowerCase()));
  }, [walletData, allowedRateServices]);

  useEffect(() => {
    if (!filteredRateOptions.length) return;
    if (!filteredRateOptions.some((r) => r.servico === rateServico)) {
      setRateServico(filteredRateOptions[0].servico);
    }
  }, [filteredRateOptions, rateServico]);

  return (
    <Layout>
      <div className="nexus-custos-page">
        <header className="nexus-custos-header">
          <div className="nexus-custos-title">
            <Cpu size={28} className="nexus-custos-icon" aria-hidden />
            <div>
              <h1>Nexus IA — custos e carteira</h1>
              <p className="nexus-custos-sub">
                Consumo unificado de tokens (faturamento) e carteira pré-paga de créditos para APIs de terceiros
                (OpenAI, voz, Akool, etc.), com taxas configuráveis por serviço.
              </p>
            </div>
          </div>
          <button type="button" className="nexus-custos-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Atualizar
          </button>
        </header>

        <div className="nexus-view-tabs">
          <button
            type="button"
            className={view === 'tokens' ? 'active' : ''}
            onClick={() => setTab('tokens')}
          >
            <BarChart3 size={18} /> Consumo (tokens)
          </button>
          <button
            type="button"
            className={view === 'wallet' ? 'active' : ''}
            onClick={() => setTab('wallet')}
          >
            <Wallet size={18} /> Carteira de créditos
          </button>
        </div>

        {view === 'tokens' && (
          <>
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
                  <div className="nexus-custos-card nexus-custos-card--highlight">
                    <span className="nexus-custos-card-label">Tokens no período</span>
                    <strong>{formatTokens(data.totalTokens)}</strong>
                  </div>
                  <div className="nexus-custos-card nexus-custos-card--accent">
                    <span className="nexus-custos-card-label">Estimativa do período (R$)</span>
                    <strong>{formatMoney(data.valorTokens)}</strong>
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
          </>
        )}

        {view === 'wallet' && (
          <section className="nexus-wallet-section">
            {walletErr && (
              <div className="nexus-custos-alert">
                <AlertCircle size={20} />
                <span>{walletErr}</span>
              </div>
            )}
            {walletLoading && !walletData && !walletErr && <p className="nexus-custos-loading">Carregando carteira…</p>}

            {walletData && (
              <>
                {!walletData.walletEnabled && (
                  <div className="nexus-wallet-info">
                    <strong>Carteira desativada neste ambiente.</strong> Peça ao suporte para definir{' '}
                    <code>NEXUS_CREDIT_WALLET=true</code> no backend. A visualização das taxas padrão continua disponível
                    para planejamento.
                  </div>
                )}

                {walletData.wallet?.consumption_paused && (
                  <div className="nexus-custos-alert nexus-wallet-alert-pause">
                    <Pause size={20} />
                    <span>
                      Consumo de APIs pausado (saldo esgotado ou pausa manual). Recarregue créditos ou reative abaixo.
                    </span>
                  </div>
                )}

                <div className="nexus-custos-cards">
                  <div className="nexus-custos-card nexus-custos-card--highlight">
                    <span className="nexus-custos-card-label">Saldo (créditos internos)</span>
                    <strong>{formatCredits(walletData.wallet?.balance_credits)}</strong>
                  </div>
                  <div className="nexus-custos-card">
                    <span className="nexus-custos-card-label">Créditos por R$ 1,00 (recarga)</span>
                    <strong>{formatCredits(walletData.wallet?.credits_per_brl)}</strong>
                  </div>
                  <div className="nexus-custos-card">
                    <span className="nexus-custos-card-label">Alerta saldo baixo (créditos)</span>
                    <strong>{formatCredits(walletData.wallet?.low_balance_threshold_credits)}</strong>
                  </div>
                  <div className="nexus-custos-card nexus-custos-card--accent">
                    <span className="nexus-custos-card-label">Pré-bloqueio ativo</span>
                    <strong>{walletData.enforce ? 'Sim (sem saldo = sem chamada)' : 'Não (só registo)'}</strong>
                  </div>
                </div>

                <div className="nexus-wallet-actions">
                  <div className="nexus-wallet-recharge">
                    <label>
                      Valor (R$)
                      <input
                        type="number"
                        min={5}
                        step={1}
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="nexus-btn-primary"
                      onClick={async () => {
                        const base = `${window.location.origin}/app/admin/nexusia-custos`;
                        const successUrl = `${base}?tab=wallet&stripe=success`;
                        const cancelUrl = `${base}?tab=wallet&stripe=cancel`;
                        try {
                          const r = await nexusWallet.checkoutStripe({
                            amount_brl: Number(rechargeAmount),
                            success_url: successUrl,
                            cancel_url: cancelUrl
                          });
                          if (r.data?.url) window.location.href = r.data.url;
                          else notify.error('Resposta sem URL de pagamento');
                        } catch (e) {
                          notify.error(e?.apiMessage || e?.response?.data?.error || 'Falha ao iniciar Stripe');
                        }
                      }}
                    >
                      <CreditCard size={18} /> Recarregar via Stripe
                    </button>
                    <button
                      type="button"
                      className="nexus-btn-secondary"
                      onClick={async () => {
                        try {
                          await nexusWallet.checkoutPagSeguro({});
                        } catch (e) {
                          notify.error(e?.response?.data?.error || 'PagSeguro ainda não disponível');
                        }
                      }}
                    >
                      PagSeguro (em breve)
                    </button>
                  </div>

                  <div className="nexus-wallet-settings">
                    <label>
                      Limiar de alerta (créditos)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="nexus-btn-secondary"
                      onClick={async () => {
                        try {
                          await nexusWallet.updateSettings({
                            low_balance_threshold_credits: Number(thresholdInput) || 0
                          });
                          notify.success('Limiar atualizado');
                          loadWallet();
                        } catch (e) {
                          notify.error(e?.response?.data?.error || 'Erro');
                        }
                      }}
                    >
                      Guardar limiar
                    </button>
                    <button
                      type="button"
                      className="nexus-btn-secondary"
                      onClick={async () => {
                        try {
                          await nexusWallet.updateSettings({ consumption_paused: false });
                          notify.success('Consumo reativado');
                          loadWallet();
                        } catch (e) {
                          notify.error(e?.response?.data?.error || 'Erro');
                        }
                      }}
                    >
                      <Play size={16} /> Reativar consumo
                    </button>
                    <button
                      type="button"
                      className="nexus-btn-secondary"
                      onClick={async () => {
                        try {
                          await nexusWallet.updateSettings({ consumption_paused: true });
                          notify.success('Consumo pausado manualmente');
                          loadWallet();
                        } catch (e) {
                          notify.error(e?.response?.data?.error || 'Erro');
                        }
                      }}
                    >
                      <Pause size={16} /> Pausar consumo
                    </button>
                    <button type="button" className="nexus-custos-refresh" onClick={loadWallet} disabled={walletLoading}>
                      <RefreshCw size={18} className={walletLoading ? 'spin' : ''} />
                    </button>
                  </div>
                </div>

                <h2 className="nexus-wallet-h2">Consumo em créditos (mês atual)</h2>
                {serviceChart.length === 0 ? (
                  <p className="nexus-custos-empty">Sem débitos na carteira neste mês.</p>
                ) : (
                  <div className="nexus-custos-chart nexus-wallet-mini-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={serviceChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--panel-bg, #1e293b)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8
                          }}
                          formatter={(v) => [formatCredits(v), 'Créditos']}
                        />
                        <Bar dataKey="credits" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <h2 className="nexus-wallet-h2">Tabela final de IA (função e custo)</h2>
                <p className="nexus-wallet-hint">
                  Referência estratégica de uso por IA no software.
                </p>
                <div className="nexus-wallet-table-wrap">
                  <table className="nexus-wallet-table">
                    <thead>
                      <tr>
                        <th>IA</th>
                        <th>Função no software</th>
                        <th>Custo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IA_COST_TABLE.map((row) => (
                        <tr key={row.ia}>
                          <td>{row.ia}</td>
                          <td>{row.funcao}</td>
                          <td className="muted">{row.custo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="nexus-wallet-h3">Taxas personalizadas desta empresa</h3>
                <div className="nexus-wallet-rate-form">
                  <select value={rateServico} onChange={(e) => setRateServico(e.target.value)}>
                    {filteredRateOptions.map((r) => (
                      <option key={r.servico} value={r.servico}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0.0000001}
                    step="any"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                    placeholder="créditos/unidade"
                  />
                  <button
                    type="button"
                    className="nexus-btn-primary"
                    onClick={async () => {
                      try {
                        await nexusWallet.upsertRate(rateServico, Number(rateValue));
                        notify.success('Taxa guardada');
                        loadWallet();
                      } catch (e) {
                        notify.error(e?.response?.data?.error || 'Erro');
                      }
                    }}
                  >
                    Aplicar taxa
                  </button>
                  <button
                    type="button"
                    className="nexus-btn-secondary"
                    onClick={async () => {
                      try {
                        await nexusWallet.deleteRate(rateServico);
                        notify.success('Removida — volta ao global');
                        loadWallet();
                      } catch (e) {
                        notify.error(e?.response?.data?.error || 'Erro');
                      }
                    }}
                  >
                    Remover override
                  </button>
                </div>
                {filteredCompanyRates.length > 0 && (
                  <ul className="nexus-wallet-override-list">
                    {filteredCompanyRates.map((r) => (
                      <li key={r.servico}>
                        <strong>{serviceLabel(r.servico)}</strong>: {formatCredits(r.credits_per_unit)} créditos/unidade
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
