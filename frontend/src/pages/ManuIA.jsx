/**
 * IMPETUS - ManuIA - Manutenção assistida por IA
 * Módulo exclusivo para equipe de manutenção (técnico, supervisor, coordenador, gerente)
 * Máquinas, diagnóstico, sensores, sessões e eventos de emergência
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { manutencaoIa } from '../services/api';
import {
  Wrench,
  Cpu,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Activity,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import './ManuIA.css';

export default function ManuIA() {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [mRes, sRes, eRes] = await Promise.all([
        manutencaoIa.getMachines().catch(() => ({ data: { machines: [] } })),
        manutencaoIa.getSensors().catch(() => ({ data: { sensors: [] } })),
        manutencaoIa.getEmergencyEvents().catch(() => ({ data: { events: [] } }))
      ]);
      setMachines(mRes.data?.machines || []);
      setSensors(sRes.data?.sensors || []);
      setEmergencyEvents(eRes.data?.events || []);
    } catch (e) {
      console.warn('[ManuIA]', e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMachineClick = async (m) => {
    setSelectedMachine(m);
    setLoadingDiag(true);
    setDiagnostic(null);
    try {
      const r = await manutencaoIa.getDiagnostic(m.id);
      setDiagnostic(r.data || null);
    } catch (e) {
      setDiagnostic({ summary: { status: 'error', message: e?.apiMessage || 'Erro ao carregar diagnóstico' } });
    } finally {
      setLoadingDiag(false);
    }
  };

  const handleStartSession = () => {
    navigate('/app/chatbot', {
      state: {
        initialMessage: 'Preciso de suporte para manutenção. Estou no ManuIA.'
      }
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="manuia-loading">
          <div className="manuia-spinner" />
          <p>Carregando ManuIA...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="manuia">
        <header className="manuia-header">
          <div className="manuia-header__left">
            <div className="manuia-header__icon">
              <Wrench size={24} />
            </div>
            <div>
              <h1>ManuIA</h1>
              <p>Manutenção assistida por IA · Diagnóstico, sensores e histórico</p>
            </div>
          </div>
          <div className="manuia-header__actions">
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} /> Atualizar
            </button>
          </div>
        </header>

        {emergencyEvents.length > 0 && (
          <section className="manuia-block manuia-block--alert">
            <h2><AlertTriangle size={20} /> Eventos de Emergência</h2>
            <ul className="manuia-event-list">
              {emergencyEvents.slice(0, 10).map((e) => (
                <li key={e.id} className="manuia-event-item">
                  <strong>{e.machine_name || 'Máquina'}</strong>
                  <span>{e.description || e.event_type}</span>
                  <span className={`manuia-badge manuia-badge--${e.severity || 'high'}`}>{e.severity}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="manuia-block">
          <h2><Cpu size={20} /> Máquinas Cadastradas</h2>
          {machines.length === 0 ? (
            <p className="manuia-empty">Nenhuma máquina cadastrada no ManuIA. O administrador pode configurar máquinas em Configurações.</p>
          ) : (
            <div className="manuia-machines-grid">
              {machines.map((m) => (
                <div
                  key={m.id}
                  className={`manuia-machine-card ${selectedMachine?.id === m.id ? 'manuia-machine-card--active' : ''}`}
                  onClick={() => handleMachineClick(m)}
                >
                  <Cpu size={20} />
                  <div className="manuia-machine-card__info">
                    <strong>{m.name || m.code}</strong>
                    <span>{m.sector || m.line_name || '-'}</span>
                  </div>
                  <ChevronRight size={18} />
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedMachine && (
          <section className="manuia-block">
            <h2><Activity size={20} /> Diagnóstico · {selectedMachine.name || selectedMachine.code}</h2>
            {loadingDiag ? (
              <div className="manuia-loading-inline">
                <div className="manuia-spinner" />
                <span>Carregando diagnóstico...</span>
              </div>
            ) : diagnostic ? (
              <div className="manuia-diagnostic">
                <div className="manuia-diagnostic__summary">
                  <span className={`manuia-badge manuia-badge--${diagnostic.summary?.status || 'operational'}`}>
                    {diagnostic.summary?.status === 'operational' ? 'Operacional' : diagnostic.summary?.status || 'N/A'}
                  </span>
                  <p>{diagnostic.summary?.message || 'Nenhum alerta ativo'}</p>
                </div>
                {diagnostic.sensors?.length > 0 && (
                  <div className="manuia-diagnostic__sensors">
                    <h3>Sensores</h3>
                    <ul>
                      {diagnostic.sensors.map((s) => (
                        <li key={s.id}>
                          {s.sensor_name || s.sensor_code}: {s.last_value != null ? `${s.last_value} ${s.unit || ''}` : '—'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {diagnostic.recent_events?.length > 0 && (
                  <div className="manuia-diagnostic__events">
                    <h3>Eventos recentes</h3>
                    <ul>
                      {diagnostic.recent_events.map((e) => (
                        <li key={e.id}>{e.description || e.event_type} — {e.severity}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        )}

        <section className="manuia-block manuia-block--ia">
          <h2><Sparkles size={20} /> IA Técnica</h2>
          <p className="manuia-block__desc">
            Use o chat com IA para diagnóstico, histórico da máquina, manuais e soluções anteriores.
          </p>
          <div className="manuia-ia-actions">
            <button type="button" className="btn btn-primary" onClick={handleStartSession}>
              <Sparkles size={16} /> Abrir Chat com IA
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/chatbot')}>
              Chat Completo
            </button>
          </div>
        </section>

        <section className="manuia-block">
          <h2><ClipboardList size={20} /> Atalhos</h2>
          <p className="manuia-block__desc">Acesso rápido a diagnóstico e ordens de serviço.</p>
          <div className="manuia-shortcuts">
            <button type="button" className="manuia-shortcut" onClick={() => navigate('/diagnostic')}>
              <ClipboardList size={16} /> Diagnosticar Falha
            </button>
            <button type="button" className="manuia-shortcut" onClick={() => navigate('/app/chatbot', { state: { initialMessage: 'Mostre minhas ordens de serviço abertas.' } })}>
              <Wrench size={16} /> Minhas OS
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
