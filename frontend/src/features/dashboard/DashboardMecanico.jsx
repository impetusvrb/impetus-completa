/**
 * DASHBOARD MECÂNICO - Camada operacional de manutenção
 * Acrescenta blocos técnicos ao dashboard existente sem remover funcionalidades.
 * Para perfil: mecânico, eletricista, eletromecânico, supervisor/coordenador/gerente de manutenção.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { dashboard, intelligentRegistration } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import {
  Wrench, ClipboardList, AlertTriangle, Clock, CheckCircle2, Package, Phone, Repeat,
  ChevronRight, Sparkles, FileEdit, History, Calendar, Users, BookOpen, Zap,   PlayCircle,
  RefreshCw, HelpCircle
} from 'lucide-react';
import { DashboardInteligente } from './index';
import './DashboardMecanico.css';

/** Prefixo enviado ao chat para especializar respostas em contexto de manutenção */
const MAINTENANCE_IA_PREFIX =
  '[Contexto: técnico de manutenção — priorize diagnóstico, causas prováveis, verificação prática, histórico de máquina, manuais e OS. Seja objetivo e orientado à ação.]\n\n';

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

function formatDt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function DashboardMecanico() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [summary, setSummary] = useState(null);
  const [cards, setCards] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [preventivesBoard, setPreventivesBoard] = useState({
    preventives_today: [],
    preventives_overdue: [],
    preventives_completed_today: []
  });
  const [recurringFailures, setRecurringFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [techInput, setTechInput] = useState('');
  const [turnRecord, setTurnRecord] = useState('');
  const [passagemText, setPassagemText] = useState('');
  const [sendingTech, setSendingTech] = useState(false);
  const [sendingTurn, setSendingTurn] = useState(false);

  const scrollToId = useCallback((id) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [
          summaryRes,
          cardsRes,
          tasksRes,
          machinesRes,
          interventionsRes,
          boardRes,
          failuresRes
        ] = await Promise.all([
          dashboard.maintenance.getSummary().catch(() => ({ data: { is_maintenance: false } })),
          dashboard.maintenance.getCards().catch(() => ({ data: { is_maintenance: false } })),
          dashboard.maintenance.getMyTasks().catch(() => ({ data: { tasks: [] } })),
          dashboard.maintenance.getMachinesAttention().catch(() => ({ data: { machines: [] } })),
          dashboard.maintenance.getInterventions().catch(() => ({ data: { interventions: [] } })),
          dashboard.maintenance.getPreventivesBoard().catch(() => ({
            data: { preventives_today: [], preventives_overdue: [], preventives_completed_today: [] }
          })),
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
          setPreventivesBoard({
            preventives_today: boardRes.data?.preventives_today || [],
            preventives_overdue: boardRes.data?.preventives_overdue || [],
            preventives_completed_today: boardRes.data?.preventives_completed_today || []
          });
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
    setTechInput((p) => (p ? `${p}\n` : '') + (prompts[id] || ''));
  };

  const handleSendTech = () => {
    if (!techInput.trim()) return;
    setSendingTech(true);
    const msg = `${MAINTENANCE_IA_PREFIX}${techInput.trim()}`;
    setTechInput('');
    navigate('/app/chatbot', { state: { initialMessage: msg } });
    setSendingTech(false);
  };

  const handlePassagemResumir = () => {
    if (!passagemText.trim() || passagemText.trim().length < 15) return;
    const msg = `${MAINTENANCE_IA_PREFIX}Resuma de forma objetiva esta passagem de turno para o próximo técnico (pendências, máquinas em observação, peças, testes):\n\n${passagemText.trim()}`;
    navigate('/app/chatbot', { state: { initialMessage: msg } });
  };

  const handleRecordTurn = async () => {
    if (!turnRecord.trim() || turnRecord.trim().length < 10) return;
    setSendingTurn(true);
    try {
      const body = {
        text: `[Registro técnico de manutenção — turno]\n\n${turnRecord.trim()}`
      };
      await intelligentRegistration.create(body);
      setTurnRecord('');
      notify.success?.('Registro enviado. A IA organizou e salvou o relato.');
    } catch (e) {
      notify.error?.(e?.response?.data?.error || e?.message || 'Não foi possível registrar.');
    } finally {
      setSendingTurn(false);
    }
  };

  const goChatHelp = (snippet) => {
    navigate('/app/chatbot', { state: { initialMessage: `${MAINTENANCE_IA_PREFIX}${snippet}` } });
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

  const pt = preventivesBoard.preventives_today || [];
  const po = preventivesBoard.preventives_overdue || [];
  const pc = preventivesBoard.preventives_completed_today || [];

  return (
    <Layout>
      <div className="dashboard-mecanico">
        {isMaintenance && (
          <>
              <div className="dashboard-mecanico__tech-header">
                <Wrench size={20} />
              <p>{summary?.frase_resumo || 'Painel de manutenção — visão operacional do seu turno.'}</p>
              </div>

            {cards && (
              <section className="dashboard-mecanico__block dashboard-mecanico__cards">
                <h2><Zap size={20} /> Indicadores Técnicos</h2>
                <div className="mecanico-cards-grid">
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/diagnostic')}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/diagnostic')}
                  >
                    <ClipboardList size={24} />
                    <span className="mecanico-card__value">{cards.ordens_abertas}</span>
                    <span className="mecanico-card__label">OS Abertas</span>
                  </div>
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => scrollToId('dashboard-mecanico-preventivas')}
                    onKeyDown={(e) => e.key === 'Enter' && scrollToId('dashboard-mecanico-preventivas')}
                  >
                    <Calendar size={24} />
                    <span className="mecanico-card__value">{cards.preventivas_dia}</span>
                    <span className="mecanico-card__label">Preventivas Hoje</span>
                  </div>
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/diagnostic')}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/diagnostic')}
                  >
                    <Clock size={24} />
                    <span className="mecanico-card__value">{cards.pendencias_turno}</span>
                    <span className="mecanico-card__label">Pendências / Peças</span>
                  </div>
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => scrollToId('dashboard-mecanico-maquinas')}
                    onKeyDown={(e) => e.key === 'Enter' && scrollToId('dashboard-mecanico-maquinas')}
                  >
                    <AlertTriangle size={24} />
                    <span className="mecanico-card__value">{cards.maquinas_atencao}</span>
                    <span className="mecanico-card__label">Máquinas em Atenção</span>
                  </div>
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => scrollToId('dashboard-mecanico-intervencoes')}
                    onKeyDown={(e) => e.key === 'Enter' && scrollToId('dashboard-mecanico-intervencoes')}
                  >
                    <CheckCircle2 size={24} />
                    <span className="mecanico-card__value">{cards.intervencoes_concluidas}</span>
                    <span className="mecanico-card__label">Concluídas Hoje</span>
                  </div>
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/diagnostic')}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/diagnostic')}
                  >
                    <Phone size={24} />
                    <span className="mecanico-card__value">{cards.chamados_aguardando}</span>
                    <span className="mecanico-card__label">Aguardando Apoio</span>
                  </div>
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    id="mecanico-card-falhas"
                    onClick={() => scrollToId('dashboard-mecanico-falhas')}
                    onKeyDown={(e) => e.key === 'Enter' && scrollToId('dashboard-mecanico-falhas')}
                  >
                    <Repeat size={24} />
                    <span className="mecanico-card__value">{recurringFailures.length}</span>
                    <span className="mecanico-card__label">Falhas Recorrentes</span>
                  </div>
                  <div
                    className="mecanico-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/app/almoxarifado-inteligente')}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/app/almoxarifado-inteligente')}
                  >
                    <Package size={24} />
                    <span className="mecanico-card__value">{cards.pecas_utilizadas}</span>
                    <span className="mecanico-card__label">Peças / Almox.</span>
                  </div>
                </div>
              </section>
            )}

            {recurringFailures.length > 0 && (
              <section className="dashboard-mecanico__block" id="dashboard-mecanico-falhas">
                <h2><Repeat size={20} /> Falhas recorrentes (90 dias)</h2>
                <ul className="mecanico-failure-chips">
                  {recurringFailures.map((f, idx) => (
                    <li key={`${f.machine_name}-${idx}`}>
                      <strong>{f.machine_name || 'Máquina'}</strong>
                      <span>{f.occurrences} ocorrências · última {formatDt(f.last_date)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="dashboard-mecanico__block">
              <h2><ClipboardList size={20} /> Minhas Tarefas de Hoje</h2>
              {tasks.length === 0 ? (
                <p className="block-empty">Nenhuma ordem de serviço atribuída no momento.</p>
              ) : (
                <ul className="mecanico-task-list">
                  {tasks.map((t) => (
                    <li key={t.id} className="mecanico-task-item">
                      <div className="mecanico-task__info">
                        <strong>{t.title}</strong>
                        <span>
                          {[t.machine_name, t.line_name, t.sector].filter(Boolean).join(' · ') || '—'}
                          {' · '}
                          <span className={`badge badge-${(t.priority || 'normal').replace('urgent', 'high')}`}>{t.priority}</span>
                          {' · '}
                          {t.status}
                          {t.scheduled_at && ` · prev. ${formatDt(t.scheduled_at)}`}
                        </span>
                      </div>
                      <div className="mecanico-task__actions">
                        <button type="button" className="btn btn-sm" title="Abrir" onClick={() => navigate('/diagnostic', { state: { workOrderId: t.id } })}>
                        Abrir <ChevronRight size={14} />
                      </button>
                        <button type="button" className="btn btn-sm btn-ghost" title="Iniciar / acompanhar" onClick={() => navigate('/diagnostic', { state: { workOrderId: t.id } })}>
                          <PlayCircle size={16} />
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" title="Atualizar com IA" onClick={() => goChatHelp(`Quero atualizar o status da OS "${t.title}" (id ${t.id}). Sugira próximos passos técnicos.`)}>
                          <RefreshCw size={16} />
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" title="Ajuda IA" onClick={() => goChatHelp(`Apoio na OS: ${t.title}. Máquina: ${t.machine_name || '—'}. Prioridade: ${t.priority}.`)}>
                          <HelpCircle size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-mecanico__block" id="dashboard-mecanico-maquinas">
              <h2><AlertTriangle size={20} /> Máquinas em Atenção</h2>
              {machines.length === 0 ? (
                <p className="block-empty">Nenhuma máquina em atenção no momento.</p>
              ) : (
                <ul className="mecanico-machine-list">
                  {machines.map((m) => (
                    <li key={m.id} className="mecanico-machine-item">
                      <div className="mecanico-machine__main">
                      <strong>{m.name || m.code}</strong>
                        <span className="mecanico-machine__sub">
                          {[m.line_name, m.sector].filter(Boolean).join(' · ') || '—'}
                        </span>
                        {m.attention_reasons?.length > 0 && (
                          <span className="mecanico-machine__reasons">{m.attention_reasons.join(' · ')}</span>
                        )}
                      </div>
                      <span className={`badge badge-${m.criticality === 'critical' ? 'critical' : 'maintenance'}`}>
                        {m.attention_label || m.operational_status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-mecanico__block dashboard-mecanico__ia">
              <h2><Sparkles size={20} /> IA Técnica IMPETUS</h2>
              <p className="block-desc">
                Descreva o problema, sintoma ou dúvida técnica. A IA prioriza diagnóstico, causas, verificação e histórico.
              </p>
              <div className="mecanico-ia-shortcuts">
                {MAINTENANCE_SHORTCUTS.map((s) => (
                  <button key={s.id} type="button" className="mecanico-shortcut-btn" onClick={() => handleTechShortcut(s.id)}>
                    <s.icon size={16} /> {s.label}
                  </button>
                ))}
              </div>
              <div className="mecanico-ia-input">
                <label className="mecanico-sr-only" htmlFor="mecanico-ia-textarea">Descrição técnica</label>
                <textarea
                  id="mecanico-ia-textarea"
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

            <section className="dashboard-mecanico__block">
              <h2><FileEdit size={20} /> Registro Técnico do Turno</h2>
              <p className="block-desc">
                Registre aqui as atividades executadas, falhas encontradas, ações realizadas, pendências e observações importantes do seu turno.
              </p>
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

            <section className="dashboard-mecanico__block" id="dashboard-mecanico-intervencoes">
              <h2><History size={20} /> Últimas Intervenções</h2>
              <p className="block-desc subtle">Memória técnica recente — reutilizada pela IA para diagnósticos futuros.</p>
              {interventions.length === 0 ? (
                <p className="block-empty">Nenhuma intervenção registrada ainda.</p>
              ) : (
                <ul className="mecanico-intervention-list">
                  {interventions.slice(0, 10).map((i) => (
                    <li key={i.id} className="mecanico-intervention-item">
                      <div>
                        <strong>{i.machine_name || i.sector || '—'}</strong>
                        <span className="mecanico-intervention__action">
                          {i.action_taken ? (i.action_taken.length > 80 ? `${i.action_taken.slice(0, 80)}…` : i.action_taken) : '—'}
                        </span>
                        {i.pending_note && (
                          <span className="mecanico-intervention__pending">Pendência: {i.pending_note}</span>
                        )}
                        <small>
                          {i.technician_name || '—'} · {formatDt(i.intervention_date)} · {i.status || '—'}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-mecanico__block" id="dashboard-mecanico-preventivas">
              <h2><Calendar size={20} /> Preventivas</h2>
              <div className="mecanico-preventive-columns">
                <div>
                  <h3 className="mecanico-preventive-sub">Hoje</h3>
                  {pt.length === 0 ? (
                    <p className="block-empty small">Nenhuma para hoje.</p>
              ) : (
                <ul className="mecanico-preventive-list">
                      {pt.map((p) => (
                    <li key={p.id} className="mecanico-preventive-item">
                      <strong>{p.title}</strong>
                      <span>{p.machine_name || p.sector} · {p.preventive_type}</span>
                          <span className={`badge badge-${p.status === 'overdue' ? 'overdue' : 'pending'}`}>{p.status}</span>
                          <span className="mecanico-preventive__time">{formatDt(p.scheduled_date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mecanico-preventive-sub warn">Vencidas / atrasadas</h3>
                  {po.length === 0 ? (
                    <p className="block-empty small">Nenhuma vencida.</p>
                  ) : (
                    <ul className="mecanico-preventive-list">
                      {po.map((p) => (
                        <li key={p.id} className="mecanico-preventive-item">
                          <strong>{p.title}</strong>
                          <span>{p.machine_name || p.sector}</span>
                          <span className="badge badge-overdue">{p.status}</span>
                          <span className="mecanico-preventive__time">{formatDt(p.scheduled_date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mecanico-preventive-sub ok">Concluídas hoje</h3>
                  {pc.length === 0 ? (
                    <p className="block-empty small">Nenhuma concluída hoje.</p>
                  ) : (
                    <ul className="mecanico-preventive-list">
                      {pc.map((p) => (
                        <li key={p.id} className="mecanico-preventive-item">
                          <strong>{p.title}</strong>
                          <span>{p.machine_name || p.sector}</span>
                          <span className="badge badge-completed">concluída</span>
                    </li>
                  ))}
                </ul>
              )}
                </div>
              </div>
            </section>

            <section className="dashboard-mecanico__block">
              <h2><Users size={20} /> Passagem de Turno</h2>
              <p className="block-desc">
                Pendências, máquinas em observação, OS abertas, testes, peças aguardando e observações para o próximo turno.
              </p>
              <textarea
                value={passagemText}
                onChange={(e) => setPassagemText(e.target.value)}
                placeholder="Ex.: Esteira 3 em teste; compressor aguardando peça; rotuladora OK após alinhamento..."
                rows={4}
                className="mecanico-turn-textarea"
              />
              <div className="mecanico-passagem-actions">
                <button type="button" className="btn btn-primary" disabled={passagemText.trim().length < 15} onClick={handlePassagemResumir}>
                  <Sparkles size={16} /> Resumir com IA
                </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/registro-inteligente')}>
                  Registro Inteligente completo
              </button>
              </div>
            </section>

            <section className="dashboard-mecanico__block">
              <h2><BookOpen size={20} /> Manuais de Máquinas</h2>
              <p className="block-desc">Consulta e organização de documentação técnica para apoio à IA.</p>
              <div className="mecanico-manual-actions">
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/admin/structural')}>
                  Cadastrar / estrutura
                </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/biblioteca')}>
                  Consultar biblioteca
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => goChatHelp('Busque informações técnicas e procedimentos nos manuais cadastrados sobre: ')}>
                  Buscar documento técnico
              </button>
              </div>
            </section>
          </>
        )}

        <div className="dashboard-mecanico__base">
          <DashboardInteligente embed />
        </div>
      </div>
    </Layout>
  );
}
