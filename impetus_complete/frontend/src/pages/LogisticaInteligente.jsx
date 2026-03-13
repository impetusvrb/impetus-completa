/**
 * IMPETUS - Logística Inteligente + Expedição Monitorada
 * Dashboard com distribuição por cargo (operador, motorista, supervisor, gerente, diretor, CEO)
 */
import React, { useState, useEffect } from 'react';
import { Truck, AlertTriangle, RefreshCw, Check, MapPin, Package, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';
import { logisticsIntelligence } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './AlmoxarifadoInteligente.css';

const STATUS_LABELS = {
  aguardando_expedicao: 'Aguardando expedição',
  em_carregamento: 'Em carregamento',
  em_transito: 'Em trânsito',
  entregue: 'Entregue',
  atraso_detectado: 'Atraso detectado',
  problema_logistico: 'Problema logístico'
};

export default function LogisticaInteligente() {
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
      const r = await logisticsIntelligence.getDashboard();
      setData(r.data?.dashboard || null);
    } catch (e) {
      notify.error(e.apiMessage || 'Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  };

  const handleAck = async (id) => {
    try {
      await logisticsIntelligence.acknowledgeAlert(id);
      load();
    } catch (e) {
      notify.error(e.apiMessage || 'Erro');
    }
  };

  const handleRunAlerts = async () => {
    try {
      setRunningAlerts(true);
      await logisticsIntelligence.runAlerts();
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
            <Truck size={48} />
            <h2>Sem acesso ao módulo</h2>
            <p>{data?.message || 'Você não tem permissão para visualizar o painel de logística.'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const { profile_level, expeditions, alerts, indicators, vehicles, routes } = data;

  return (
    <Layout>
      <div className="almoxarifado-inteligente">
        <header className="almox-header">
          <div className="header-left">
            <div className="page-icon" style={{ background: 'linear-gradient(135deg, #1e88e5, #0d47a1)' }}>
              <Truck size={24} color="white" />
            </div>
            <div>
              <h1>Logística Inteligente</h1>
              <p>Expedição monitorada — dados conforme seu perfil ({profile_level})</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} /> Atualizar
            </button>
            {['gerente', 'diretor', 'ceo', 'supervisor', 'admin'].includes(profile_level) && (
              <button className="btn btn-primary" onClick={handleRunAlerts} disabled={runningAlerts}>
                {runningAlerts ? 'Processando...' : 'Rodar detecção de alertas'}
              </button>
            )}
          </div>
        </header>

        {/* Indicadores (supervisor+) */}
        {indicators && (
          <div className="indicators-cards">
            <div className="ind-card">
              <Package size={20} />
              <span className="label">Entregas (30d)</span>
              <span className="value">{indicators.deliveries_total}</span>
            </div>
            <div className="ind-card">
              <TrendingUp size={20} />
              <span className="label">No prazo</span>
              <span className="value">{indicators.deliveries_on_time}</span>
            </div>
            <div className="ind-card warning">
              <AlertTriangle size={20} />
              <span className="label">Atrasadas</span>
              <span className="value">{indicators.deliveries_delayed}</span>
            </div>
            <div className="ind-card">
              <MapPin size={20} />
              <span className="label">Taxa no prazo</span>
              <span className="value">{indicators.on_time_rate_pct != null ? `${indicators.on_time_rate_pct}%` : '-'}</span>
            </div>
            {indicators.fleet_utilization_pct != null && (
              <div className="ind-card">
                <Truck size={20} />
                <span className="label">Uso da frota</span>
                <span className="value">{indicators.fleet_utilization_pct}%</span>
              </div>
            )}
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
                        {(Array.isArray(a.ai_recommendations) ? a.ai_recommendations : []).map((rec, i) => (
                          <li key={i}>{typeof rec === 'string' ? rec : rec}</li>
                        ))}
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

        {/* Expedições */}
        {expeditions?.length > 0 && (
          <section className="section">
            <h2>Expedições recentes</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Produto</th>
                    <th>Peso (kg)</th>
                    <th>Veículo</th>
                    <th>Motorista</th>
                    <th>Rota</th>
                    <th>Status</th>
                    <th>Saída</th>
                    <th>Previsão</th>
                  </tr>
                </thead>
                <tbody>
                  {expeditions.slice(0, 30).map((e) => (
                    <tr key={e.id} className={e.status === 'atraso_detectado' ? 'risk-high' : ''}>
                      <td>{e.order_ref || '-'}</td>
                      <td>{e.product_ref || '-'}</td>
                      <td>{e.weight_kg != null ? e.weight_kg : '-'}</td>
                      <td>{e.plate_or_id || '-'}</td>
                      <td>{e.driver_name || '-'}</td>
                      <td>{e.route_name || '-'}</td>
                      <td>{STATUS_LABELS[e.status] || e.status}</td>
                      <td>{e.departure_at ? new Date(e.departure_at).toLocaleString('pt-BR') : '-'}</td>
                      <td>{e.estimated_arrival_at ? new Date(e.estimated_arrival_at).toLocaleString('pt-BR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Frota (gerente+) */}
        {vehicles?.length > 0 && (
          <section className="section">
            <h2>Status da frota</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Capacidade (kg)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td>{v.plate_or_id}</td>
                      <td>{v.vehicle_type}</td>
                      <td>{v.capacity_kg ?? '-'}</td>
                      <td>{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Rotas (gerente+) */}
        {routes?.length > 0 && (
          <section className="section">
            <h2>Rotas cadastradas</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Distância (km)</th>
                    <th>Tempo (min)</th>
                    <th>Risco</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.distance_km ?? '-'}</td>
                      <td>{r.avg_duration_minutes ?? '-'}</td>
                      <td>{r.logistic_risk_level || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!expeditions?.length && !alerts?.length && !indicators && !vehicles?.length && !routes?.length && (
          <div className="empty-state">
            <Truck size={48} />
            <p>Nenhum dado para exibir. Configure veículos, rotas e motoristas em Admin → Logística, depois registre expedições.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
