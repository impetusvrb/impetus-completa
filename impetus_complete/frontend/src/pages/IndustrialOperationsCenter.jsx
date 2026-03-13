/**
 * IMPETUS - Centro de Operações Industrial
 * Protocolo IA: Controle e Segurança de Máquinas
 * Prioridade: 1) Segurança humana 2) Integridade do equipamento 3) Continuidade 4) Automação
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboard } from '../services/api';
import { Cpu, AlertTriangle, Activity, Gauge, Shield, RefreshCw, Power, ArrowLeft, Wrench, CheckCircle, ListChecks, Map, TrendingDown, WifiOff } from 'lucide-react';
import { SkeletonCard } from '../components/Skeleton';
import './IndustrialOperationsCenter.css';

const INTERVENTION_TYPES = [
  { value: 'manutencao', label: 'Manutenção geral' },
  { value: 'manutencao_mecanica', label: 'Manutenção mecânica' },
  { value: 'manutencao_eletrica', label: 'Manutenção elétrica' },
  { value: 'calibracao', label: 'Calibração' },
  { value: 'inspecao', label: 'Inspeção' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'outro', label: 'Outro' }
];

export default function IndustrialOperationsCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [machines, setMachines] = useState([]);
  const [safetyInstructions, setSafetyInstructions] = useState([]);
  const [automationMode, setAutomationMode] = useState('monitor');
  const [canConfigure, setCanConfigure] = useState(false);
  const [tab, setTab] = useState('status');
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('');
  const [interventionForm, setInterventionForm] = useState({ machine_identifier: '', machine_name: '', intervention_type: 'manutencao' });
  const [releasing, setReleasing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const [statusRes, autoRes, machinesRes, safetyRes] = await Promise.all([
        dashboard.industrial.getStatus(),
        dashboard.industrial.getAutomation(),
        dashboard.industrial.getMachines().catch(() => ({ data: { machines: [] } })),
        dashboard.industrial.getSafetyInstructions().catch(() => ({ data: { instructions: [] } }))
      ]);
      if (statusRes?.data?.ok) setData(statusRes.data);
      if (autoRes?.data?.automation_mode) setAutomationMode(autoRes.data.automation_mode);
      if (autoRes?.data?.can_configure) setCanConfigure(true);
      setMachines(machinesRes?.data?.machines || []);
      setSafetyInstructions(safetyRes?.data?.instructions || []);
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
  const interventionsActive = data?.interventions_active || [];
  const offlineEquipment = data?.offline_equipment || [];
  const failurePredictions = data?.failure_predictions || [];
  const unackedCount = events.filter((e) => !e.acknowledged).length;
  const machineOptions = machines.length > 0 ? machines : profiles.map((p) => ({ machine_identifier: p.machine_identifier, machine_name: p.machine_name || p.machine_identifier }));

  const handleRegisterIntervention = async () => {
    const { machine_identifier, machine_name, intervention_type } = interventionForm;
    if (!machine_identifier) return alert('Selecione o equipamento.');
    try {
      const r = await dashboard.industrial.registerIntervention({ machine_identifier, machine_name: machine_name || machine_identifier, intervention_type });
      if (r?.data?.ok) {
        setInterventionForm({ machine_identifier: '', machine_name: '', intervention_type: 'manutencao' });
        load();
      } else alert(r?.data?.error || 'Erro ao registrar intervenção.');
    } catch (e) {
      alert(e?.apiMessage || e?.response?.data?.error || 'Erro ao registrar intervenção.');
    }
  };

  const handleRelease = async (machine_identifier) => {
    setReleasing(machine_identifier);
    try {
      const r = await dashboard.industrial.releaseEquipment({ machine_identifier });
      if (r?.data?.ok) load();
      else alert(r?.data?.error || 'Erro ao liberar.');
    } catch (e) {
      alert(e?.apiMessage || e?.response?.data?.error || 'Erro ao liberar.');
    } finally {
      setReleasing(null);
    }
  };

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
              <span className="ioc-subtitle">Integração com Máquinas · Protocolo IA de Segurança</span>
            </div>
          </div>
          <button className="ioc-refresh" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} size={18} />
            Atualizar
          </button>
        </header>

        <div className="ioc-warning-banner">
          <AlertTriangle size={24} className="ioc-warning-icon" />
          <div>
            <strong>ATENÇÃO</strong>
            <p>Equipamentos controlados por automação de IA podem ser ativados automaticamente. Antes de realizar qualquer manutenção: registre a intervenção no sistema, siga os procedimentos de segurança e garanta que o equipamento esteja isolado. A segurança dos colaboradores é prioridade absoluta.</p>
          </div>
        </div>

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
              {['status', 'mapa', 'eventos', 'perfis', 'intervencao'].map((t) => (
                <button key={t} className={`ioc-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'status' && <Activity size={16} />}
                  {t === 'mapa' && <Map size={16} />}
                  {t === 'eventos' && <AlertTriangle size={16} />}
                  {t === 'perfis' && <Gauge size={16} />}
                  {t === 'intervencao' && <Wrench size={16} />}
                  {t === 'status' && 'Status'}
                  {t === 'mapa' && 'Mapa'}
                  {t === 'eventos' && 'Eventos'}
                  {t === 'perfis' && 'Perfis'}
                  {t === 'intervencao' && 'Intervenção'}
                  {t === 'eventos' && unackedCount > 0 && <span className="ioc-badge">{unackedCount}</span>}
                  {t === 'intervencao' && interventionsActive.length > 0 && <span className="ioc-badge">{interventionsActive.length}</span>}
                  {t === 'mapa' && offlineEquipment.length > 0 && <span className="ioc-badge ioc-badge-warn">{offlineEquipment.length}</span>}
                </button>
              ))}
            </nav>

            {tab === 'status' && (
              <section className="ioc-status-full">
                <div className="ioc-cards">
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
                  <div className={`ioc-card ${offlineEquipment.length > 0 ? 'alert' : ''}`}>
                    <WifiOff />
                    <h3>Equipamentos offline</h3>
                    <p className="ioc-val">{offlineEquipment.length}</p>
                  </div>
                  <div className={`ioc-card ${failurePredictions.length > 0 ? 'alert' : ''}`}>
                    <TrendingDown />
                    <h3>Previsões de falha</h3>
                    <p className="ioc-val">{failurePredictions.length}</p>
                  </div>
                </div>
                {offlineEquipment.length > 0 && (
                  <div className="ioc-offline-list">
                    <h4>Equipamentos sem leitura recente (&gt;15 min)</h4>
                    <ul>
                      {offlineEquipment.map((o, i) => (
                        <li key={i}>{o.machine_name || o.machine_identifier}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {failurePredictions.length > 0 && (
                  <div className="ioc-predictions-list">
                    <h4>Previsões e alertas críticos</h4>
                    {failurePredictions.slice(0, 5).map((p, i) => (
                      <div key={i} className={`ioc-event severity-${p.severity || 'medium'}`}>
                        <span className="ioc-event-type">{p.event_type}</span>
                        <span className="ioc-event-machine">{p.machine_name || p.machine_identifier}</span>
                        <span className="ioc-event-desc">{p.description || '-'}</span>
                        <span className="ioc-event-time">{p.created_at ? new Date(p.created_at).toLocaleString('pt-BR') : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === 'mapa' && (
              <section className="ioc-map">
                <h3>Mapa operacional da fábrica</h3>
                <p className="ioc-map-desc">Linhas de produção e equipamentos monitorados. Atualizado continuamente pela IA.</p>
                <div className="ioc-map-grid">
                  {profiles.map((p) => (
                    <div
                      key={p.machine_identifier}
                      className={`ioc-map-card ${offlineEquipment.some((o) => o.machine_identifier === p.machine_identifier) ? 'offline' : ''} ${interventionsActive.some((i) => i.machine_identifier === p.machine_identifier) ? 'intervention' : ''}`}
                    >
                      <Power size={20} />
                      <strong>{p.machine_name || p.machine_identifier}</strong>
                      {p.line_name && <span>Linha {p.line_name}</span>}
                      <div className="ioc-map-card-status">
                        {offlineEquipment.some((o) => o.machine_identifier === p.machine_identifier) ? (
                          <span className="status-offline">Offline</span>
                        ) : interventionsActive.some((i) => i.machine_identifier === p.machine_identifier) ? (
                          <span className="status-intervention">Em intervenção</span>
                        ) : (
                          <span className="status-ok">Monitorando</span>
                        )}
                      </div>
                      {(p.temperature_avg != null || p.vibration_avg != null) && (
                        <div className="ioc-map-card-metrics">
                          {p.temperature_avg != null && <small>{parseFloat(p.temperature_avg).toFixed(1)}°C</small>}
                          {p.vibration_avg != null && <small>{parseFloat(p.vibration_avg).toFixed(2)} mm/s</small>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {profiles.length === 0 && (
                  <p className="ioc-empty">O Machine Brain está aprendendo. As máquinas aparecerão conforme os dados forem coletados.</p>
                )}
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

            {tab === 'intervencao' && (
              <section className="ioc-intervention">
                <div className="ioc-safety-instructions">
                  <ListChecks size={20} />
                  <div>
                    <h3>Procedimento de Segurança Antes da Manutenção</h3>
                    <ol>
                      {(safetyInstructions.length ? safetyInstructions : [
                        { step: 1, title: 'Desligar o equipamento', desc: 'Interromper o ciclo operacional e parar a máquina de forma segura.' },
                        { step: 2, title: 'Desligar a chave geral de energia', desc: 'Cortar a alimentação elétrica na chave principal.' },
                        { step: 3, title: 'Isolar a fonte de alimentação', desc: 'Usar bloqueio e etiquetagem (LOTOTO) para garantir que ninguém religue.' },
                        { step: 4, title: 'Confirmar ausência de pressão ou energia', desc: 'Verificar que não há energia residual (elétrica, hidráulica, pneumática).' },
                        { step: 5, title: 'Sinalizar que a máquina está em manutenção', desc: 'Colocar placa ou aviso visível: "EM MANUTENÇÃO - NÃO LIGAR".' }
                      ]).map((i) => (
                        <li key={i.step}>
                          <strong>{i.step}. {i.title}</strong> — {i.desc}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="ioc-intervention-form">
                  <h3>Registrar intervenção</h3>
                  <p className="ioc-intervention-desc">Ao registrar, a automação da IA será bloqueada imediatamente neste equipamento.</p>
                  <div className="ioc-form-row">
                    <select
                      value={interventionForm.machine_identifier}
                      onChange={(e) => {
                        const opt = machineOptions.find((m) => m.machine_identifier === e.target.value);
                        setInterventionForm({ ...interventionForm, machine_identifier: e.target.value, machine_name: opt?.machine_name || e.target.value });
                      }}
                      className="ioc-select"
                    >
                      <option value="">Selecione o equipamento</option>
                      {machineOptions.map((m) => (
                        <option key={m.machine_identifier} value={m.machine_identifier}>{m.machine_name || m.machine_identifier}</option>
                      ))}
                    </select>
                    <select
                      value={interventionForm.intervention_type}
                      onChange={(e) => setInterventionForm({ ...interventionForm, intervention_type: e.target.value })}
                      className="ioc-select"
                    >
                      {INTERVENTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-primary" onClick={handleRegisterIntervention} disabled={!interventionForm.machine_identifier}>
                      Registrar intervenção
                    </button>
                  </div>
                </div>
                <div className="ioc-intervention-active">
                  <h3>Intervenções ativas (automação bloqueada)</h3>
                  {interventionsActive.length === 0 ? (
                    <p className="ioc-empty">Nenhuma intervenção ativa.</p>
                  ) : (
                    <div className="ioc-intervention-list">
                      {interventionsActive.map((i) => (
                        <div key={i.id} className="ioc-intervention-item">
                          <div className="ioc-intervention-item-info">
                            <strong>{i.machine_name || i.machine_identifier}</strong>
                            <span>Responsável: {i.technician_name || i.registered_by_name || '-'}</span>
                            <span>Tipo: {INTERVENTION_TYPES.find((t) => t.value === i.intervention_type)?.label || i.intervention_type}</span>
                            <span className="ioc-intervention-time">{i.registered_at ? new Date(i.registered_at).toLocaleString('pt-BR') : ''}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-success ioc-release-btn"
                            onClick={() => handleRelease(i.machine_identifier)}
                            disabled={releasing === i.machine_identifier}
                          >
                            <CheckCircle size={16} />
                            {releasing === i.machine_identifier ? 'Liberando...' : 'Liberar equipamento'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
