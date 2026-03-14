/**
 * IMPETUS - Centro de Operações Industrial
 * Mapa da fábrica, status das máquinas, alertas em tempo real, previsão de falhas
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboard } from '../services/api';
import { Cpu, AlertTriangle, Activity, Gauge, Shield, RefreshCw, Power, ArrowLeft } from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';
import './IndustrialOperationsCenter.css';

export default function IndustrialOperationsCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [automationMode, setAutomationMode] = useState('monitor');
  const [canConfigure, setCanConfigure] = useState(false);
  const [tab, setTab] = useState('status');
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [statusRes, autoRes] = await Promise.all([
        dashboard.industrial.getStatus(),
        dashboard.industrial.getAutomation()
      ]);
      if (statusRes?.data?.ok) setData(statusRes.data);
      if (autoRes?.data?.automation_mode) setAutomationMode(autoRes.data.automation_mode);
      if (autoRes?.data?.can_configure) setCanConfigure(true);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || e?.apiMessage || 'Erro ao carregar módulo.';
      if (status === 403) {
        setAccessDenied(true);
        setAccessDeniedMessage(msg);
        setData(null);
      }
      console.warn('Industrial center load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const handleSetMode = async (mode) => {
    try {
      const r = await dashboard.industrial.setAutomation({ mode });
      if (r?.data?.ok) setAutomationMode(mode);
      else alert(r?.data?.error || 'Erro ao alterar modo');
    } catch (e) {
      const msg = e?.response?.status === 403
        ? (e?.response?.data?.error || 'Permissão insuficiente. Apenas Administrador pode alterar o modo de operação.')
        : (e?.apiMessage || 'Erro ao alterar modo.');
      alert(msg);
    }
  };

  const profiles = data?.profiles || [];
  const events = data?.events || [];
  const unackedCount = events.filter((e) => !e.acknowledged).length;

  if (accessDenied) {
    return (
      <Layout>
        <div className="industrial-ops-center ioc-forbidden">
          <div className="ioc-forbidden-card">
            <AlertTriangle size={48} className="ioc-forbidden-icon" />
            <h2>Permissão insuficiente</h2>
            <p>{accessDeniedMessage}</p>
            <button className="ioc-forbidden-btn" onClick={() => navigate('/app')}>
              <ArrowLeft size={18} /> Voltar ao Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="industrial-ops-center">
        <header className="ioc-header">
          <div className="ioc-title">
            <Cpu size={28} />
            <div>
              <h1>Centro de Operações Industrial</h1>
              <span className="ioc-subtitle">Machine Brain · Monitoramento 24/7</span>
            </div>
          </div>
          <button className="ioc-refresh" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} size={18} />
            Atualizar
          </button>
        </header>

        <section className="ioc-automation">
          <Shield size={20} />
          <span>Modo de operação:</span>
          <div className="ioc-mode-btns">
            {['monitor', 'assisted', 'automatic'].map((m) => (
              <button
                key={m}
                className={`ioc-mode-btn ${automationMode === m ? 'active' : ''}`}
                onClick={() => canConfigure && handleSetMode(m)}
                disabled={!canConfigure}
                title={!canConfigure ? 'Apenas Administrador pode alterar o modo' : ''}
              >
                {m === 'monitor' && 'Monitoramento'}
                {m === 'assisted' && 'Assistido'}
                {m === 'automatic' && 'Automático'}
              </button>
            ))}
          </div>
          <small>
            {automationMode === 'monitor' && 'IA apenas observa.'}
            {automationMode === 'assisted' && 'IA sugere ações.'}
            {automationMode === 'automatic' && 'IA pode executar comandos (apenas equip. auxiliares).'}
          </small>
          {!canConfigure && <small className="ioc-config-hint">Alteração do modo restrita ao Administrador.</small>}
        </section>

        {loading && !data ? (
          <div className="ioc-loading">
            <div className="ioc-skeleton-grid">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          </div>
        ) : (
          <>
            <nav className="ioc-tabs">
              {['status', 'eventos', 'perfis'].map((t) => (
                <button key={t} className={`ioc-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'status' && <Activity size={16} />}
                  {t === 'eventos' && <AlertTriangle size={16} />}
                  {t === 'perfis' && <Gauge size={16} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'eventos' && unackedCount > 0 && <span className="ioc-badge">{unackedCount}</span>}
                </button>
              ))}
            </nav>

            {tab === 'status' && (
              <section className="ioc-cards">
                <div className="ioc-card">
                  <Activity />
                  <h3>Máquinas monitoradas</h3>
                  <p className="ioc-val">{data?.machines_count ?? 0}</p>
                </div>
                <div className="ioc-card alert">
                  <AlertTriangle />
                  <h3>Alertas recentes</h3>
                  <p className="ioc-val">{events.length}</p>
                </div>
                <div className="ioc-card">
                  <Gauge />
                  <h3>Perfis ativos</h3>
                  <p className="ioc-val">{profiles.length}</p>
                </div>
              </section>
            )}

            {tab === 'eventos' && (
              <section className="ioc-events">
                {events.length === 0 ? (
                  <p className="ioc-empty">Nenhum evento detectado.</p>
                ) : (
                  events.map((e, i) => (
                    <div key={i} className={`ioc-event severity-${e.severity || 'medium'}`}>
                      <span className="ioc-event-type">{e.event_type}</span>
                      <span className="ioc-event-machine">{e.machine_name || e.line_name || '-'}</span>
                      <span className="ioc-event-desc">{e.description}</span>
                      <span className="ioc-event-time">
                        {e.created_at ? new Date(e.created_at).toLocaleString('pt-BR') : ''}
                      </span>
                    </div>
                  ))
                )}
              </section>
            )}

            {tab === 'perfis' && (
              <section className="ioc-profiles">
                {profiles.length === 0 ? (
                  <p className="ioc-empty">Nenhum perfil operacional. O Machine Brain aprende com o monitoramento.</p>
                ) : (
                  profiles.map((p) => (
                    <div key={p.id} className="ioc-profile">
                      <div className="ioc-profile-header">
                        <Power size={18} />
                        <strong>{p.machine_name || p.machine_identifier}</strong>
                        {p.line_name && <span>Linha {p.line_name}</span>}
                      </div>
                      <div className="ioc-profile-grid">
                        {p.temperature_avg != null && (
                          <div>
                            <small>Temp. média</small>
                            <span>{parseFloat(p.temperature_avg).toFixed(1)}°C</span>
                          </div>
                        )}
                        {p.vibration_avg != null && (
                          <div>
                            <small>Vibração</small>
                            <span>{parseFloat(p.vibration_avg).toFixed(2)} mm/s</span>
                          </div>
                        )}
                        {p.pressure_avg != null && (
                          <div>
                            <small>Pressão</small>
                            <span>{parseFloat(p.pressure_avg).toFixed(2)}</span>
                          </div>
                        )}
                        {p.rpm_avg != null && (
                          <div>
                            <small>RPM</small>
                            <span>{parseInt(p.rpm_avg, 10)}</span>
                          </div>
                        )}
                        <div>
                          <small>Amostras</small>
                          <span>{p.sample_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
