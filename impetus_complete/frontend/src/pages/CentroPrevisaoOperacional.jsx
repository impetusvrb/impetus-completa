/**
 * IMPETUS - Centro de Previsão Operacional e Financeira
 * Gestão antecipada: projeções 7/10/14/30 dias, lucro/prejuízo, simulação de decisões
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboard } from '../services/api';
import {
  TrendingUp, TrendingDown, AlertTriangle, Activity, DollarSign, Wrench, Zap, Search, Heart,
  RefreshCw, ArrowLeft, BarChart3, MessageSquare, Settings, Target, Play
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './CentroPrevisaoOperacional.css';

const PROJ_DAYS = [7, 10, 14, 30];
const DECISION_ACTIONS = [
  { key: 'aumentar_producao', label: 'Aumentar produção 10%', value: { percent: 10 }, icon: TrendingUp },
  { key: 'reduzir_desperdicio', label: 'Reduzir desperdício 20%', value: { percent: 20 }, icon: Target },
  { key: 'aumentar_eficiencia', label: 'Aumentar eficiência 15%', value: { percent: 15 }, icon: Activity },
  { key: 'parar_maquina_manutencao', label: 'Parar máquina para manutenção', value: {}, icon: Wrench },
  { key: 'alterar_turno', label: 'Alterar turno de equipe', value: {}, icon: Activity }
];

const METRIC_BUTTONS = [
  { key: 'eficiencia', label: 'Eficiência', icon: TrendingUp },
  { key: 'perdas', label: 'Perdas', icon: TrendingDown },
  { key: 'prejuizo', label: 'Prejuízo', icon: DollarSign },
  { key: 'custo_operacional', label: 'Custo Operacional', icon: BarChart3 },
  { key: 'producao', label: 'Produção', icon: Activity },
  { key: 'risco_falhas', label: 'Risco de Falhas', icon: Wrench }
];

export default function CentroPrevisaoOperacional() {
  const navigate = useNavigate();
  const [metric, setMetric] = useState('eficiencia');
  const [projections, setProjections] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const [profitLoss, setProfitLoss] = useState(null);
  const [profitDays, setProfitDays] = useState(14);
  const [extendedProj, setExtendedProj] = useState(null);
  const [criticalFactors, setCriticalFactors] = useState(null);
  const [decisionSim, setDecisionSim] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [config, setConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configForm, setConfigForm] = useState({ revenue_per_day: '', revenue_per_month: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [
        projRes, alertsRes, healthRes, simRes,
        plRes, extRes, cfRes, cfgRes
      ] = await Promise.all([
        dashboard.forecasting.getProjections(metric),
        dashboard.forecasting.getAlerts(15),
        dashboard.forecasting.getHealth(),
        dashboard.forecasting.getSimulation(48),
        dashboard.forecasting.getProfitLoss(profitDays),
        dashboard.forecasting.getExtendedProjections(),
        dashboard.forecasting.getCriticalFactors(),
        dashboard.forecasting.getConfig()
      ]);
      if (projRes?.data?.ok) setProjections(projRes.data);
      if (alertsRes?.data?.ok) setAlerts(alertsRes.data.alerts || []);
      if (healthRes?.data?.ok) setHealth(healthRes.data.health);
      if (simRes?.data?.ok) setSimulation(simRes.data.simulation);
      if (plRes?.data?.ok) setProfitLoss(plRes.data);
      if (extRes?.data?.ok) setExtendedProj(extRes.data);
      if (cfRes?.data?.ok) setCriticalFactors(cfRes.data);
      if (cfgRes?.data?.ok) {
        setConfig(cfgRes.data.config);
        setConfigForm({
          revenue_per_day: cfgRes.data.config?.revenue_per_day ?? '',
          revenue_per_month: cfgRes.data.config?.revenue_per_month ?? ''
        });
      }
    } catch (e) {
      if (e?.response?.status === 403) setAccessDenied(true);
      console.warn('Forecasting load:', e);
    } finally {
      setLoading(false);
    }
  }, [metric, profitDays]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAsk = async () => {
    if (!question?.trim() || question.trim().length < 5) return;
    setAsking(true);
    setAiAnswer(null);
    try {
      const r = await dashboard.forecasting.ask(question.trim());
      if (r?.data?.ok) setAiAnswer(r.data.response);
      else setAiAnswer(r?.data?.error || 'Erro ao processar.');
    } catch (e) {
      setAiAnswer(e?.apiMessage || e?.response?.data?.error || 'Erro ao processar pergunta.');
    } finally {
      setAsking(false);
    }
  };

  const handleSimulateDecision = async (action, value) => {
    setSimulating(true);
    setDecisionSim(null);
    try {
      const r = await dashboard.forecasting.simulateDecision(action, { ...(value || {}), days: profitDays });
      if (r?.data?.ok) setDecisionSim(r.data.simulation);
    } catch (e) {
      setDecisionSim({ error: e?.apiMessage || 'Erro ao simular' });
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      await dashboard.forecasting.updateConfig({
        revenue_per_day: parseFloat(configForm.revenue_per_day) || null,
        revenue_per_month: parseFloat(configForm.revenue_per_month) || null
      });
      setShowConfigModal(false);
      load();
    } catch (e) {
      console.warn('Config save:', e);
    } finally {
      setConfigSaving(false);
    }
  };

  const fmt = (v) => (v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-');

  if (accessDenied) {
    return (
      <Layout>
        <div className="centro-previsao cpo-forbidden">
          <div className="cpo-forbidden-card">
            <AlertTriangle size={48} />
            <h2>Acesso restrito</h2>
            <p>O Centro de Previsão Operacional é voltado para CEO e Diretores.</p>
            <button className="cpo-btn" onClick={() => navigate('/app')}>
              <ArrowLeft size={18} /> Voltar ao Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const chartData = projections?.series?.map((s) => ({
    name: s.label,
    value: typeof s.value === 'number' ? Math.round(s.value * 100) / 100 : s.value,
    [metric]: typeof s.value === 'number' ? Math.round(s.value * 100) / 100 : s.value
  })) || [];

  const isPrejuizo = metric === 'prejuizo';

  return (
    <Layout>
      <div className="centro-previsao">
        <header className="cpo-header">
          <div className="cpo-title">
            <Zap size={28} />
            <div>
              <h1>Centro de Previsão Operacional e Financeira</h1>
              <span className="cpo-subtitle">Gestão antecipada · Projeções 7 a 30 dias · Simulação de decisões</span>
            </div>
          </div>
          <div className="cpo-header-actions">
            <button className="cpo-config-btn" onClick={() => setShowConfigModal(true)} title="Configurar receita">
              <Settings size={18} /> Receita
            </button>
            <button className="cpo-refresh" onClick={load} disabled={loading}>
              <RefreshCw className={loading ? 'spin' : ''} size={18} /> Atualizar
            </button>
          </div>
        </header>

        {/* Saúde da Empresa */}
        {health && (
          <section className="cpo-health">
            <Heart size={22} />
            <h3>Saúde da Empresa</h3>
            <div className="cpo-health-grid">
              <div className="cpo-health-item">
                <span className="cpo-health-val">{health.eficiencia_geral}%</span>
                <small>Eficiência geral</small>
              </div>
              <div className="cpo-health-item">
                <span className="cpo-health-val">{health.riscos_operacionais}</span>
                <small>Riscos operacionais</small>
              </div>
              <div className="cpo-health-item">
                <span className="cpo-health-val">R$ {(health.prejuizo_evitavel || 0).toLocaleString('pt-BR')}</span>
                <small>Prejuízo evitável</small>
              </div>
              <div className="cpo-health-item">
                <span className="cpo-health-val">{health.equipamentos_offline}</span>
                <small>Equip. offline</small>
              </div>
              {health.gargalos_producao?.length > 0 && (
                <div className="cpo-health-item cpo-gargalo">
                  <span>{health.gargalos_producao[0]}</span>
                  <small>Gargalo</small>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Botões de análise */}
        <section className="cpo-metric-btns">
          {METRIC_BUTTONS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                className={`cpo-metric-btn ${metric === m.key ? 'active' : ''}`}
                onClick={() => setMetric(m.key)}
              >
                <Icon size={18} />
                {m.label}
              </button>
            );
          })}
        </section>

        {/* Gráfico de projeção */}
        <section className="cpo-chart">
          <h3>
            Projeção: {METRIC_BUTTONS.find((m) => m.key === metric)?.label || metric}
          </h3>
          <p className="cpo-chart-desc">Linha do tempo: Agora → 2h → 1 dia → 2 dias → 2 semanas</p>
          {loading ? (
            <div className="cpo-loading">Carregando...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              {isPrejuizo ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `R$${v / 1000}k` : `R$${v}`)} />
                  <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`} />
                  <Bar dataKey="value" fill="#1e40af" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e40af" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#1e40af" fillOpacity={1} fill="url(#colorMetric)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="cpo-empty">Sem dados de projeção. O sistema aprende conforme os dados são coletados.</div>
          )}
        </section>

        {/* Alertas e Simulação - grid */}
        <div className="cpo-grid-2">
          <section className="cpo-alerts">
            <h3><AlertTriangle size={20} /> Alertas Inteligentes</h3>
            {alerts.length === 0 ? (
              <p className="cpo-empty">Nenhum alerta recente.</p>
            ) : (
              <ul className="cpo-alert-list">
                {alerts.slice(0, 8).map((a, i) => (
                  <li key={a.id || i} className={`cpo-alert severity-${a.severity || 'medium'}`}>
                    <strong>{a.machine || a.type}</strong>
                    <span>{a.description}</span>
                    <small>Impacto: {a.impact}</small>
                    <small>Sugestão: {a.suggestion}</small>
                    <span className="cpo-alert-time">{a.time ? new Date(a.time).toLocaleString('pt-BR') : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cpo-simulation">
            <h3>Simulação de Futuro</h3>
            <p className="cpo-sim-desc">Se a empresa continuar operando como está (48h):</p>
            {simulation ? (
              <div className="cpo-sim-result">
                <div><strong>Eficiência projetada:</strong> {simulation.efficiency_projection?.toFixed(1)}%</div>
                <div><strong>Perda de produção:</strong> {simulation.production_loss_projection?.toFixed(1)}%</div>
                <div><strong>Prejuízo estimado:</strong> R$ {(simulation.estimated_loss || 0).toLocaleString('pt-BR')}</div>
                <div><strong>Alertas críticos:</strong> {simulation.critical_alerts}</div>
                <div className="cpo-sim-suggestion">{simulation.suggestion}</div>
              </div>
            ) : (
              <div className="cpo-empty">Carregando simulação...</div>
            )}
          </section>
        </div>

        {/* Projeção Lucro/Prejuízo */}
        <section className="cpo-profit-loss">
          <h3><DollarSign size={20} /> Projeção para os próximos dias</h3>
          <div className="cpo-profit-days">
            {PROJ_DAYS.map((d) => (
              <button key={d} className={`cpo-profit-day-btn ${profitDays === d ? 'active' : ''}`} onClick={() => setProfitDays(d)}>
                {d} dias
              </button>
            ))}
          </div>
          {profitLoss ? (
            <div className={`cpo-profit-card ${profitLoss.tipo_resultado}`}>
              <div className="cpo-profit-row">
                <span>Receita estimada:</span>
                <strong>{fmt(profitLoss.receita_estimada)}</strong>
              </div>
              <div className="cpo-profit-row">
                <span>Custos operacionais:</span>
                <strong>{fmt(profitLoss.custos_operacionais_estimados)}</strong>
              </div>
              <div className="cpo-profit-row">
                <span>Perdas (eventos):</span>
                <strong>{fmt(profitLoss.perdas_eventos)}</strong>
              </div>
              <div className="cpo-profit-row cpo-profit-total">
                <span>Resultado projetado:</span>
                <strong>{profitLoss.tipo_resultado === 'lucro' ? 'Lucro' : 'Prejuízo'} {fmt(profitLoss.resultado_projetado)}</strong>
              </div>
            </div>
          ) : (
            <div className="cpo-empty">Carregando projeção... Configure a receita em &quot;Receita&quot; para ver lucro/prejuízo.</div>
          )}
        </section>

        {/* Fatores que impactam */}
        {criticalFactors && (criticalFactors.factors?.length > 0 || criticalFactors.maquinas_baixo_desempenho?.length > 0) && (
          <section className="cpo-critical">
            <h3><AlertTriangle size={20} /> Fatores que impactam a projeção</h3>
            <div className="cpo-critical-grid">
              {criticalFactors.factors?.map((f, i) => (
                <div key={i} className={`cpo-factor impact-${f.impacto}`}>
                  <strong>{f.descricao}</strong>
                  <span>{f.setor}</span>
                </div>
              ))}
              {criticalFactors.maquinas_baixo_desempenho?.slice(0, 3).map((m, i) => (
                <div key={`m-${i}`} className="cpo-factor cpo-machine">
                  <strong>{m.descricao}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Simulação de decisão */}
        <section className="cpo-decision">
          <h3><Play size={20} /> Simular decisão antes de executar</h3>
          <p className="cpo-decision-desc">Simule o impacto de ações e veja a nova projeção recalculada pela IA.</p>
          <div className="cpo-decision-btns">
            {DECISION_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  className="cpo-decision-btn"
                  onClick={() => handleSimulateDecision(a.key, a.value)}
                  disabled={simulating}
                >
                  <Icon size={18} /> {a.label}
                </button>
              );
            })}
          </div>
          {decisionSim && (
            <div className={`cpo-decision-result ${decisionSim.error ? 'error' : decisionSim.tipo_resultado}`}>
              {decisionSim.error ? (
                <p>{decisionSim.error}</p>
              ) : (
                <>
                  <strong>{decisionSim.scenario}</strong>
                  <p>{decisionSim.impact_description}</p>
                  <div className="cpo-decision-metrics">
                    <span>Receita: {fmt(decisionSim.receita_projetada)}</span>
                    <span>Custos: {fmt(decisionSim.custos_projetados)}</span>
                    <span><strong>{decisionSim.tipo_resultado === 'lucro' ? 'Lucro' : 'Prejuízo'}: {fmt(decisionSim.resultado_projetado)}</strong></span>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* Projeções estendidas (7, 10, 14, 30 dias) */}
        {extendedProj?.projections?.length > 0 && (
          <section className="cpo-extended">
            <h3><BarChart3 size={20} /> Projeções por período</h3>
            <div className="cpo-extended-table-wrap">
              <table className="cpo-extended-table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Custo operacional</th>
                    <th>Perdas eventos</th>
                    <th>Total custos</th>
                    <th>Eficiência</th>
                    <th>Risco parada</th>
                  </tr>
                </thead>
                <tbody>
                  {extendedProj.projections.map((p) => (
                    <tr key={p.days}>
                      <td><strong>{p.label}</strong></td>
                      <td>{fmt(p.cost_operational)}</td>
                      <td>{fmt(p.cost_losses)}</td>
                      <td>{fmt(p.cost_total)}</td>
                      <td>{p.efficiency}%</td>
                      <td>{p.risk_stop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Modal configuração receita */}
        {showConfigModal && (
          <div className="cpo-modal-overlay" onClick={() => setShowConfigModal(false)}>
            <div className="cpo-modal" onClick={(e) => e.stopPropagation()}>
              <h3><Settings size={20} /> Configurar receita para projeção</h3>
              <p className="cpo-modal-desc">Informe a receita média para calcular lucro ou prejuízo projetado.</p>
              <div className="cpo-modal-fields">
                <label>Receita por dia (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50000"
                  value={configForm.revenue_per_day}
                  onChange={(e) => setConfigForm((f) => ({ ...f, revenue_per_day: e.target.value }))}
                />
                <label>Receita por mês (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1500000"
                  value={configForm.revenue_per_month}
                  onChange={(e) => setConfigForm((f) => ({ ...f, revenue_per_month: e.target.value }))}
                />
              </div>
              <div className="cpo-modal-actions">
                <button onClick={() => setShowConfigModal(false)}>Cancelar</button>
                <button className="primary" onClick={handleSaveConfig} disabled={configSaving}>
                  {configSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Perguntar à IA */}
        <section className="cpo-ask">
          <h3><MessageSquare size={20} /> Perguntar à IA</h3>
          <p>Exemplos: &quot;Quanto a empresa pode perder se continuar assim por 7 dias?&quot; | &quot;Qual máquina tem maior risco de quebrar?&quot;</p>
          <div className="cpo-ask-row">
            <input
              type="text"
              className="cpo-ask-input"
              placeholder="Digite sua pergunta..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              disabled={asking}
            />
            <button className="cpo-ask-btn" onClick={handleAsk} disabled={asking || !question?.trim()}>
              <Search size={18} /> {asking ? 'Analisando...' : 'Perguntar'}
            </button>
          </div>
          {aiAnswer && (
            <div className="cpo-answer">
              <strong>Resposta da IA:</strong>
              <p>{aiAnswer}</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
