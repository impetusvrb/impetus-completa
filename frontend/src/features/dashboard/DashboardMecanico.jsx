/**
 * DASHBOARD MECÂNICO - Camada operacional de manutenção
 * Acrescenta blocos técnicos ao dashboard existente sem remover funcionalidades.
 * Para perfil: mecânico, eletricista, eletromecânico, supervisor/coordenador/gerente de manutenção.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { dashboard } from '../../services/api';
import { intelligentRegistration } from '../../services/api';
import {
  Wrench, ClipboardList, AlertTriangle, Clock, CheckCircle2, Package, Phone, Repeat,
  ChevronRight, Sparkles, FileEdit, History, Calendar, Users, BookOpen, Zap
} from 'lucide-react';
import IntelligentDynamicDashboard from './IntelligentDynamicDashboard';
import './DashboardMecanico.css';

const MAINTENANCE_SHORTCUTS = [
  { id: 'diagnosticar', label: 'Diagnosticar falha', icon: Wrench },
  { id: 'historico', label: 'Consultar histórico da máquina', icon: History },
  { id: 'manual', label: 'Buscar manual técnico', icon: BookOpen },
  { id: 'passo_a_passo', label: 'Montar passo a passo', icon: ClipboardList },
  { id: 'resumir', label: 'Resumir intervenção', icon: FileEdit },
  { id: 'registro', label: 'Organizar registro técnico', icon: FileEdit },
  { id: 'solucoes', label: 'Ver soluções anteriores', icon: Repeat },
  { id: 'manuais', label: 'Consultar manuais cadastrados', icon: BookOpen }
];

export default function DashboardMecanico() {
  const navigate = useNavigate();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [summary, setSummary] = useState(null);
  const [cards, setCards] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [preventives, setPreventives] = useState([]);
  const [recurringFailures, setRecurringFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [techInput, setTechInput] = useState('');
  const [turnRecord, setTurnRecord] = useState('');
  const [sendingTech, setSendingTech] = useState(false);
  const [sendingTurn, setSendingTurn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [summaryRes, cardsRes, tasksRes, machinesRes, interventionsRes, preventivesRes, failuresRes] = await Promise.all([
          dashboard.maintenance.getSummary().catch(() => ({ data: { is_maintenance: false } })),
          dashboard.maintenance.getCards().catch(() => ({ data: { is_maintenance: false } })),
          dashboard.maintenance.getMyTasks().catch(() => ({ data: { tasks: [] } })),
          dashboard.maintenance.getMachinesAttention().catch(() => ({ data: { machines: [] } })),
          dashboard.maintenance.getInterventions().catch(() => ({ data: { interventions: [] } })),
          dashboard.maintenance.getPreventives().catch(() => ({ data: { preventives: [] } })),
          dashboard.maintenance.getRecurringFailures().catch(() => ({ data: { failures: [] } }))
        ]);
        if (cancelled) return;
        const maint = summaryRes.data?.is_maintenance ?? false;
        setIsMaintenance(maint);
        if (maint) {
          setSummary(summaryRes.data?.summary);
          setCards(cardsRes.data?.cards);
          setTasks(tasksRes.data?.tasks || []);
          setMachines(machinesRes.data?.machines || []);
          setInterventions(interventionsRes.data?.interventions || []);
          setPreventives(preventivesRes.data?.preventives || []);
          setRecurringFailures(failuresRes.data?.failures || []);
        }
      } catch (e) {
        if (!cancelled) setIsMaintenance(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleTechShortcut = (id) => {
    const prompts = {
      diagnosticar: 'Preciso diagnosticar uma falha. ',
      historico: 'Mostre o histórico de intervenções da máquina: ',
      manual: 'Busque no manual técnico informações sobre: ',
      passo_a_passo: 'Monte um passo a passo para: ',
      resumir: 'Resuma a intervenção: ',
      registro: 'Organize este registro técnico: ',
      solucoes: 'Há soluções anteriores parecidas para: ',
      manuais: 'Consulte os manuais cadastrados sobre: '
    };
    setTechInput((p) => (p ? p + '\n' : '') + (prompts[id] || ''));
  };

  const handleSendTech = () => {
    if (!techInput.trim()) return;
    setSendingTech(true);
    const msg = techInput.trim();
    setTechInput('');
    navigate('/app/chatbot', { state: { initialMessage: msg } });
    setSendingTech(false);
  };

  const handleRecordTurn = async () => {
    if (!turnRecord.trim() || turnRecord.trim().length < 10) return;
    setSendingTurn(true);
    try {
      await intelligentRegistration.create({ text: turnRecord.trim() });
      setTurnRecord('');
    } finally {
      setSendingTurn(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-mecanico-loading">
          <div className="dashboard-mecanico-spinner" />
          <p>Carregando dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-mecanico">
        {/* Camada de manutenção - só exibe se perfil for manutenção */}
        {isMaintenance && (
          <>
            {/* 1. Cabeçalho técnico complementar */}
            {summary?.frase_resumo && (
              <div className="dashboard-mecanico__tech-header">
                <Wrench size={20} />
                <p>{summary.frase_resumo}</p>
              </div>
            )}

            {/* 2. Cards técnicos */}
            {cards && (
              <section className="dashboard-mecanico__block dashboard-mecanico__cards">
                <h2><Zap size={20} /> Indicadores Técnicos</h2>
                <div className="mecanico-cards-grid">
                  <div className="mecanico-card" onClick={() => navigate('/diagnostic')}>
                    <ClipboardList size={24} />
                    <span className="mecanico-card__value">{cards.ordens_abertas}</span>
                    <span className="mecanico-card__label">OS Abertas</span>
                  </div>
                  <div className="mecanico-card">
                    <Calendar size={24} />
                    <span className="mecanico-card__value">{cards.preventivas_dia}</span>
                    <span className="mecanico-card__label">Preventivas Hoje</span>
                  </div>
                  <div className="mecanico-card">
                    <Clock size={24} />
                    <span className="mecanico-card__value">{cards.pendencias_turno}</span>
                    <span className="mecanico-card__label">Pendências Turno</span>
                  </div>
                  <div className="mecanico-card">
                    <AlertTriangle size={24} />
                    <span className="mecanico-card__value">{cards.maquinas_atencao}</span>
                    <span className="mecanico-card__label">Máquinas em Atenção</span>
                  </div>
                  <div className="mecanico-card">
                    <CheckCircle2 size={24} />
                    <span className="mecanico-card__value">{cards.intervencoes_concluidas}</span>
                    <span className="mecanico-card__label">Concluídas Hoje</span>
                  </div>
                  <div className="mecanico-card">
                    <Phone size={24} />
                    <span className="mecanico-card__value">{cards.chamados_aguardando}</span>
                    <span className="mecanico-card__label">Aguardando Apoio</span>
                  </div>
                  <div className="mecanico-card">
                    <Repeat size={24} />
                    <span className="mecanico-card__value">{recurringFailures.length}</span>
                    <span className="mecanico-card__label">Falhas Recorrentes</span>
                  </div>
                  <div className="mecanico-card">
                    <Package size={24} />
                    <span className="mecanico-card__value">{cards.pecas_utilizadas}</span>
                    <span className="mecanico-card__label">Peças Hoje</span>
                  </div>
                </div>
              </section>
            )}

            {/* 3. Minhas Tarefas de Hoje */}
            <section className="dashboard-mecanico__block">
              <h2><ClipboardList size={20} /> Minhas Tarefas de Hoje</h2>
              {tasks.length === 0 ? (
                <p className="block-empty">Nenhuma tarefa atribuída no momento.</p>
              ) : (
                <ul className="mecanico-task-list">
                  {tasks.map((t) => (
                    <li key={t.id} className="mecanico-task-item">
                      <div className="mecanico-task__info">
                        <strong>{t.title}</strong>
                        <span>{t.machine_name || t.sector || '-'} · {t.priority} · {t.status}</span>
                      </div>
                      <button type="button" className="btn btn-sm" onClick={() => navigate('/diagnostic')}>
                        Abrir <ChevronRight size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 4. Máquinas em Atenção */}
            <section className="dashboard-mecanico__block">
              <h2><AlertTriangle size={20} /> Máquinas em Atenção</h2>
              {machines.length === 0 ? (
                <p className="block-empty">Nenhuma máquina em atenção no momento.</p>
              ) : (
                <ul className="mecanico-machine-list">
                  {machines.map((m) => (
                    <li key={m.id} className="mecanico-machine-item">
                      <strong>{m.name || m.code}</strong>
                      <span className={`badge badge-${m.criticality || 'medium'}`}>{m.operational_status || m.criticality}</span>
                      {m.open_failures > 0 && <span className="badge badge-failures">{m.open_failures} falha(s)</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 5. IA Técnica IMPETUS */}
            <section className="dashboard-mecanico__block dashboard-mecanico__ia">
              <h2><Sparkles size={20} /> IA Técnica IMPETUS</h2>
              <p className="block-desc">Foco em diagnóstico, histórico da máquina, manuais e soluções anteriores.</p>
              <div className="mecanico-ia-shortcuts">
                {MAINTENANCE_SHORTCUTS.map((s) => (
                  <button key={s.id} type="button" className="mecanico-shortcut-btn" onClick={() => handleTechShortcut(s.id)}>
                    <s.icon size={16} /> {s.label}
                  </button>
                ))}
              </div>
              <div className="mecanico-ia-input">
                <textarea
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  placeholder="Ex.: motor da esteira aquecendo, sensor não reconhece, cilindro não avança, rotuladora desalinhando, painel desarmando..."
                  rows={3}
                />
                <button type="button" className="btn btn-primary" onClick={handleSendTech} disabled={!techInput.trim() || sendingTech}>
                  {sendingTech ? 'Enviando...' : 'Enviar para IA'}
                </button>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/chatbot')}>
                Abrir Chat Completo
              </button>
            </section>

            {/* 6. Registro Técnico do Turno */}
            <section className="dashboard-mecanico__block">
              <h2><FileEdit size={20} /> Registro Técnico do Turno</h2>
              <p className="block-desc">Registre atividades, falhas encontradas, ações realizadas, pendências e observações. A IA organiza em registro estruturado.</p>
              <textarea
                value={turnRecord}
                onChange={(e) => setTurnRecord(e.target.value)}
                placeholder="O que fez, o que encontrou, o que trocou, o que ficou pendente, máquina em risco, peça em falta..."
                rows={4}
                className="mecanico-turn-textarea"
              />
              <button type="button" className="btn btn-primary" onClick={handleRecordTurn} disabled={!turnRecord.trim() || turnRecord.trim().length < 10 || sendingTurn}>
                <Sparkles size={16} /> {sendingTurn ? 'Processando...' : 'Registrar com IA'}
              </button>
            </section>

            {/* 7. Últimas Intervenções */}
            <section className="dashboard-mecanico__block">
              <h2><History size={20} /> Últimas Intervenções</h2>
              {interventions.length === 0 ? (
                <p className="block-empty">Nenhuma intervenção recente.</p>
              ) : (
                <ul className="mecanico-intervention-list">
                  {interventions.slice(0, 8).map((i) => (
                    <li key={i.id} className="mecanico-intervention-item">
                      <strong>{i.machine_name || i.sector}</strong>
                      <span>{i.action_taken ? (i.action_taken.length > 60 ? `${i.action_taken.slice(0, 60)}...` : i.action_taken) : '-'}</span>
                      <small>{i.technician_name} · {new Date(i.intervention_date).toLocaleString('pt-BR')}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 8. Preventivas do Dia */}
            <section className="dashboard-mecanico__block">
              <h2><Calendar size={20} /> Preventivas do Dia</h2>
              {preventives.length === 0 ? (
                <p className="block-empty">Nenhuma preventiva agendada para hoje.</p>
              ) : (
                <ul className="mecanico-preventive-list">
                  {preventives.map((p) => (
                    <li key={p.id} className="mecanico-preventive-item">
                      <strong>{p.title}</strong>
                      <span>{p.machine_name || p.sector} · {p.preventive_type}</span>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 9. Passagem de Turno - atalho */}
            <section className="dashboard-mecanico__block">
              <h2><Users size={20} /> Passagem de Turno</h2>
              <p className="block-desc">Use o Registro Técnico acima para documentar pendências, máquinas em observação e observações para o próximo turno. A IA pode ajudar a resumir.</p>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/registro-inteligente')}>
                Abrir Registro Inteligente
              </button>
            </section>

            {/* 10. Manuais de Máquinas - atalho */}
            <section className="dashboard-mecanico__block">
              <h2><BookOpen size={20} /> Manuais de Máquinas</h2>
              <p className="block-desc">Cadastre e consulte manuais técnicos. A IA utiliza esses materiais para apoio em diagnóstico e procedimentos.</p>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/biblioteca')}>
                Ir para Biblioteca
              </button>
            </section>
          </>
        )}

        {/* Dashboard Inteligente Dinâmico - layout por perfil */}
        <div className="dashboard-mecanico__base">
          <IntelligentDynamicDashboard embed />
        </div>
      </div>
    </Layout>
  );
}
