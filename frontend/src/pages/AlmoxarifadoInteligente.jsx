/**
 * IMPETUS - Almoxarifado Inteligente
 * Dashboard com distribuição por cargo/área (estoque, alertas, previsões, materiais parados)
 */
import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, Clock, BarChart3, RefreshCw, Check } from 'lucide-react';
import Layout from '../components/Layout';
import { warehouseIntelligence } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AlmoxarifadoInteligente.css';

export default function AlmoxarifadoInteligente() {
  const notify = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningAlerts, setRunningAlerts] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await warehouseIntelligence.getDashboard();
      setData(r.data?.dashboard || null);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  };

  const handleAck = async (id) => {
    try {
      await warehouseIntelligence.acknowledgeAlert(id);
      load();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro');
    }
  };

  const handleRunAlerts = async () => {
    try {
      setRunningAlerts(true);
      await warehouseIntelligence.runAlerts();
      notify.success('Alertas atualizados!');
      load();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro');
    } finally {
      setRunningAlerts(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="almoxarifado-inteligente">
          <div className="page-loading">Carregando painel...</div>
        </div>
      </Layout>
    );
  }

  if (!data || data.profile_level === 'none') {
    return (
      <Layout>
        <div className="almoxarifado-inteligente">
          <div className="no-access">
            <Package size={48} />
            <h2>Sem acesso ao módulo</h2>
            <p>{data?.message || 'Você não tem permissão para visualizar o painel de almoxarifado.'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const { profile_level, below_min_stock, movements, alerts, predictions, indicators, consumption_by_category, idle_materials, balances } = data;

  return (
    <Layout>
      <div className="almoxarifado-inteligente">
        <header className="almox-header">
          <div className="header-left">
            <div className="page-icon">
              <Package size={24} />
            </div>
            <div>
              <h1>Almoxarifado Inteligente</h1>
              <p>Dados distribuídos conforme seu perfil ({profile_level})</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} /> Atualizar
            </button>
            {['gerente', 'diretor', 'ceo', 'admin'].includes(profile_level) && (
              <button className="btn btn-primary" onClick={handleRunAlerts} disabled={runningAlerts}>
                {runningAlerts ? 'Processando...' : 'Rodar detecção de alertas'}
              </button>
            )}
          </div>
        </header>

        {/* Indicadores (gerente+) */}
        {indicators && (
          <div className="indicators-cards">
            <div className="ind-card">
              <BarChart3 size={20} />
              <span className="label">Materiais cadastrados</span>
              <span className="value">{indicators.total_materials}</span>
            </div>
            <div className="ind-card warning">
              <AlertTriangle size={20} />
              <span className="label">Abaixo do mínimo</span>
              <span className="value">{indicators.below_min_count}</span>
            </div>
            <div className="ind-card">
              <Clock size={20} />
              <span className="label">Materiais parados (60d)</span>
              <span className="value">{indicators.idle_materials_count}</span>
            </div>
            <div className="ind-card">
              <TrendingUp size={20} />
              <span className="label">Movimentações (30d)</span>
              <span className="value">{indicators.total_movements_30d}</span>
            </div>
          </div>
        )}

        {/* Alertas */}
        {alerts?.length > 0 && (
          <section className="section">
            <h2><AlertTriangle size={20} /> Alertas ({alerts.length})</h2>
            <div className="alerts-list">
              {alerts.map((a) => (
                <div key={a.id} className={`alert-item severity-${a.severity}`}>
                  <div className="alert-content">
                    <strong>{a.title}</strong>
                    <p>{a.description}</p>
                    {a.ai_recommendations?.length > 0 && (
                      <ul>
                        {a.ai_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                      </ul>
                    )}
                  </div>
                  <button className="btn-icon" onClick={() => handleAck(a.id)} title="Reconhecer">
                    <Check size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Materiais abaixo do mínimo */}
        {below_min_stock?.length > 0 && (
          <section className="section">
            <h2>Abaixo do estoque mínimo</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Material</th>
                    <th>Saldo</th>
                    <th>Mínimo</th>
                    <th>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {below_min_stock.map((m) => (
                    <tr key={m.id}>
                      <td>{m.code}</td>
                      <td>{m.name}</td>
                      <td className="danger">{m.current_quantity}</td>
                      <td>{m.min_stock}</td>
                      <td>{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Previsões (gerente+) */}
        {predictions?.length > 0 && (
          <section className="section">
            <h2>Previsões de reposição</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Saldo</th>
                    <th>Consumo/dia</th>
                    <th>Dias até acabar</th>
                    <th>Sugestão compra</th>
                    <th>Insight</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.material_id} className={`risk-${p.risk_level}`}>
                      <td>{p.material_name}</td>
                      <td>{p.current_quantity} {p.unit}</td>
                      <td>{p.consumption_rate_per_day?.toFixed(2) || '-'}</td>
                      <td>{p.days_until_depletion ?? '-'}</td>
                      <td>{p.suggested_quantity != null ? `${Math.ceil(p.suggested_quantity)} ${p.unit}` : '-'}</td>
                      <td className="insight">{p.insight_text || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Materiais parados */}
        {idle_materials?.length > 0 && (
          <section className="section">
            <h2>Materiais parados (60+ dias sem movimentação)</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Material</th>
                    <th>Saldo</th>
                    <th>Dias parado</th>
                    <th>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {idle_materials.slice(0, 20).map((m) => (
                    <tr key={m.id}>
                      <td>{m.code}</td>
                      <td>{m.name}</td>
                      <td>{m.current_quantity}</td>
                      <td>{m.days_without_movement}</td>
                      <td>{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Consumo por categoria */}
        {consumption_by_category?.length > 0 && (
          <section className="section">
            <h2>Consumo por categoria (30 dias)</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Materiais</th>
                    <th>Total consumido</th>
                  </tr>
                </thead>
                <tbody>
                  {consumption_by_category.map((c) => (
                    <tr key={c.category_id || c.category_name}>
                      <td>{c.category_name || 'Sem categoria'}</td>
                      <td>{c.materials_count}</td>
                      <td>{parseFloat(c.total_consumed || 0).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Saldo atual / Movimentações (operacional) */}
        {balances?.length > 0 && (
          <section className="section">
            <h2>Saldo atual (principais)</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Material</th>
                    <th>Saldo</th>
                    <th>Mínimo</th>
                    <th>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.material_id}>
                      <td>{b.material_code}</td>
                      <td>{b.material_name}</td>
                      <td>{parseFloat(b.quantity || 0).toLocaleString('pt-BR')}</td>
                      <td>{b.min_stock}</td>
                      <td>{b.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {movements?.length > 0 && (
          <section className="section">
            <h2>Últimas movimentações</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Material</th>
                    <th>Tipo</th>
                    <th>Quantidade</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 30).map((m) => (
                    <tr key={m.id}>
                      <td>{m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '-'}</td>
                      <td>{m.material_name}</td>
                      <td>{formatMovementType(m.movement_type)}</td>
                      <td>{m.quantity} {m.unit}</td>
                      <td>{m.user_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!below_min_stock?.length && !alerts?.length && !predictions?.length && !idle_materials?.length && !movements?.length && !balances?.length && !consumption_by_category?.length && (
          <div className="empty-state">
            <Package size={48} />
            <p>Nenhum dado para exibir no momento. Cadastre materiais e movimentações no painel administrativo.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function formatMovementType(t) {
  const map = { entrada: 'Entrada', saida: 'Saída', consumo_producao: 'Consumo Produção', consumo_manutencao: 'Consumo Manutenção', ajuste: 'Ajuste' };
  return map[t] || t;
}
