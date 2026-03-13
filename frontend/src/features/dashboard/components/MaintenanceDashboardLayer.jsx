/**
 * CAMADA OPERACIONAL DE MANUTENÇÃO
 * Blocos técnicos para perfil mecânico/eletricista - sem remover blocos existentes
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, AlertTriangle, Target, Clock, Bot, FileText, History, Calendar,
  ChevronRight, Play, CheckCircle, HelpCircle, BookOpen, Sparkles
} from 'lucide-react';
import { dashboard } from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';

const CARD_LABELS = {
  ordens_abertas: { label: 'OS Abertas', icon: Target, color: 'blue' },
  preventivas_dia: { label: 'Preventivas do Dia', icon: Calendar, color: 'teal' },
  pendencias_turno: { label: 'Pendências Turno', icon: Clock, color: 'orange' },
  maquinas_atencao: { label: 'Máquinas em Atenção', icon: AlertTriangle, color: 'red' },
  intervencoes_concluidas: { label: 'Intervenções Hoje', icon: CheckCircle, color: 'green' },
  chamados_aguardando: { label: 'Aguardando Apoio', icon: HelpCircle, color: 'purple' },
  pecas_utilizadas: { label: 'Peças Utilizadas', icon: Wrench, color: 'gray' }
};

const IA_SHORTCUTS = [
  { key: 'diagnostico', label: 'Diagnosticar falha' },
  { key: 'historico', label: 'Consultar histórico da máquina' },
  { key: 'manual', label: 'Buscar manual técnico' },
  { key: 'passo', label: 'Montar passo a passo' },
  { key: 'resumir', label: 'Resumir intervenção' },
  { key: 'registro', label: 'Organizar registro técnico' },
  { key: 'solucoes', label: 'Ver soluções anteriores' }
];

export default function MaintenanceDashboardLayer() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [summary, setSummary] = useState(null);
  const [cards, setCards] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [preventives, setPreventives] = useState([]);
  const [recurringFailures, setRecurringFailures] = useState([]);
  const [shiftLogs, setShiftLogs] = useState([]);
  const [iaQuestion, setIaQuestion] = useState('');
  const [shiftRecord, setShiftRecord] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingLog, setSavingLog] = useState(false);

  const fetchMaintenance = useCallback(async () => {
    try {
      const [s, c, t, m, i, p, r, sh] = await Promise.all([
        dashboard.maintenance.getSummary(),
        dashboard.maintenance.getCards(),
        dashboard.maintenance.getMyTasks(),
        dashboard.maintenance.getMachinesAttention(),
        dashboard.maintenance.getInterventions(),
        dashboard.maintenance.getPreventives(),
        dashboard.maintenance.getRecurringFailures(),
        dashboard.maintenance.getShiftHandovers()
      ]);
      if (s?.data?.is_maintenance && s.data?.summary) setSummary(s.data.summary);
      if (c?.data?.is_maintenance && c.data?.cards) setCards(c.data.cards);
      if (t?.data?.is_maintenance) setTasks(t.data?.tasks || []);
      if (m?.data?.is_maintenance) setMachines(m.data?.machines || []);
      if (i?.data?.is_maintenance) setInterventions(i.data?.interventions || []);
      if (p?.data?.is_maintenance) setPreventives(p.data?.preventives || []);
      if (r?.data?.is_maintenance) setRecurringFailures(r.data?.failures || []);
      if (sh?.data?.logs) setShiftLogs(sh.data.logs || []);
    } catch (e) {
      if (e?.response?.status !== 401) setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMaintenance(); }, [fetchMaintenance]);

  const handleIaShortcut = (shortcut) => {
    const prompts = {
      diagnostico: 'Preciso diagnosticar uma falha. Descreva o problema:',
      historico: 'Consulte o histórico de intervenções desta máquina:',
      manual: 'Busque no manual técnico cadastrado:',
      passo: 'Monte um passo a passo de verificação para:',
      resumir: 'Resuma a intervenção realizada:',
      registro: 'Organize este registro técnico:',
      solucoes: 'Mostre soluções anteriores parecidas para:'
    };
    setIaQuestion(prompts[shortcut] || shortcut);
  };

  const handleIaSubmit = () => {
    if (iaQuestion.trim()) navigate('/app/chatbot', { state: { initialMessage: iaQuestion } });
  };

  const handleSaveShiftLog = async (withAI = false) => {
    if (!shiftRecord.trim()) {
      notify.warning('Digite o registro do turno');
      return;
    }
    setSavingLog(true);
    try {
      if (withAI) {
        await dashboard.maintenance.saveShiftLogWithAI({ content: shiftRecord });
        notify.success('Registro salvo e organizado pela IA!');
      } else {
        await dashboard.maintenance.saveShiftLog({ content: shiftRecord });
        notify.success('Registro salvo!');
      }
      setShiftRecord('');
      fetchMaintenance();
    } catch (e) {
      notify.error(e?.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSavingLog(false);
    }
  };

  if (loading || (!summary && !cards)) return null;

  return (
    <div className="maintenance-dashboard-layer">
      {/* 1. Cabeçalho técnico */}
      {summary?.frase_resumo && (
        <div className="maintenance-header-tech">
          <Wrench size={20} />
          <p>{summary.frase_resumo}</p>
        </div>
      )}

      {/* 2. Cards técnicos */}
      {cards && (
        <section className="dashboard-inteligente__block block-maintenance-cards">
          <h2><Target size={20} /> Indicadores Técnicos</h2>
          <div className="maintenance-cards-grid">
            {Object.entries(cards).map(([key, value]) => {
              const meta = CARD_LABELS[key];
              if (!meta) return null;
              const Icon = meta?.icon || Target;
              return (
                <button
                  key={key}
                  type="button"
                  className={`maintenance-card maintenance-card--${meta.color}`}
                  onClick={() => navigate('/diagnostic')}
                >
                  <Icon size={18} />
                  <span className="maintenance-card__value">{value}</span>
                  <span className="maintenance-card__label">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Minhas Tarefas + 4. Máquinas em Atenção (grid 2 col) */}
      <div className="maintenance-grid-2">
        {/* Minhas Tarefas de Hoje */}
        <section className="dashboard-inteligente__block block-maintenance-tasks">
          <h2><Clock size={20} /> Minhas Tarefas de Hoje</h2>
          {tasks.length === 0 ? (
            <p className="block-desc">Nenhuma OS atribuída no momento.</p>
          ) : (
            <ul className="maintenance-list">
              {tasks.slice(0, 5).map((t) => (
                <li key={t.id} className="maintenance-task-item">
                  <div>
                    <strong>{t.title || t.machine_name}</strong>
                    <span className="maintenance-task-meta">{t.machine_name} • {t.status}</span>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/diagnostic')}>
                    Abrir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Máquinas em Atenção */}
        <section className="dashboard-inteligente__block block-machines-attention">
          <h2><AlertTriangle size={20} /> Máquinas em Atenção</h2>
          {machines.length === 0 ? (
            <p className="block-desc">Nenhuma máquina em atenção no momento.</p>
          ) : (
            <ul className="maintenance-list">
              {machines.slice(0, 5).map((m, idx) => (
                <li key={m.id || idx} className="maintenance-machine-item">
                  <strong>{m.name || m.code}</strong>
                  <span>{m.operational_status || m.criticality}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 5. IA Técnica IMPETUS */}
      <section className="dashboard-inteligente__block block-ia-tecnica">
        <h2><Bot size={20} /> IA Técnica IMPETUS</h2>
        <p className="block-desc">Foco em diagnóstico, manuais, histórico e registro técnico.</p>
        <div className="ia-tecnica-input">
          <input
            type="text"
            placeholder="Ex.: motor da esteira aquecendo, sensor não reconhece, rotuladora desalinhando..."
            value={iaQuestion}
            onChange={(e) => setIaQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIaSubmit()}
            className="form-input"
          />
          <button type="button" className="btn btn-primary" onClick={handleIaSubmit}>
            Enviar
          </button>
        </div>
        <div className="ia-shortcuts">
          {IA_SHORTCUTS.map((s) => (
            <button key={s.key} type="button" className="btn btn-ghost btn-sm" onClick={() => handleIaShortcut(s.key)}>
              {s.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/app/settings')} title="Manuais">
            <BookOpen size={14} /> Manuais
          </button>
        </div>
      </section>

      {/* 6. Registro Técnico do Turno */}
      <section className="dashboard-inteligente__block block-registro-turno">
        <h2><FileText size={20} /> Registro Técnico do Turno</h2>
        <p className="block-desc">Registre o que fez, encontrou, trocou, pendências e observações do seu turno.</p>
        <textarea
          placeholder="O que fez, encontrou, trocou, ficou pendente, máquina em risco, peça em falta..."
          value={shiftRecord}
          onChange={(e) => setShiftRecord(e.target.value)}
          rows={4}
          className="form-textarea"
        />
        <div className="block-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleSaveShiftLog(false)}
            disabled={savingLog || !shiftRecord.trim()}
          >
            Salvar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSaveShiftLog(true)}
            disabled={savingLog || !shiftRecord.trim()}
          >
            <Sparkles size={16} /> Registrar com IA
          </button>
        </div>
      </section>

      {/* 7. Últimas Intervenções + 8. Preventivas do Dia (grid 2 col) */}
      <div className="maintenance-grid-2">
        <section className="dashboard-inteligente__block block-interventions">
          <h2><History size={20} /> Últimas Intervenções</h2>
          {interventions.length === 0 ? (
            <p className="block-desc">Nenhuma intervenção recente.</p>
          ) : (
            <ul className="maintenance-list">
              {interventions.slice(0, 5).map((i, idx) => (
                <li key={i.id || idx}>
                  <strong>{i.machine_name}</strong> – {i.action_taken}
                  <span className="maintenance-meta">{i.technician_name} • {new Date(i.intervention_date).toLocaleString('pt-BR', { dateStyle: 'short' })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-inteligente__block block-preventives">
          <h2><Calendar size={20} /> Preventivas do Dia</h2>
          {preventives.length === 0 ? (
            <p className="block-desc">Nenhuma preventiva programada para hoje.</p>
          ) : (
            <ul className="maintenance-list">
              {preventives.slice(0, 5).map((p, idx) => (
                <li key={p.id || idx}>
                  <strong>{p.machine_name}</strong> – {p.title}
                  <span className="maintenance-meta">{p.status} • {p.assigned_name || '-'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 9. Passagem de Turno / Histórico de registros */}
      {shiftLogs.length > 0 && (
        <section className="dashboard-inteligente__block block-passagem-turno">
          <h2><FileText size={20} /> Passagem de Turno</h2>
          <p className="block-desc">Registros recentes do turno.</p>
          <ul className="maintenance-list">
            {shiftLogs.slice(0, 3).map((log) => (
              <li key={log.id}>
                <small>{new Date(log.created_at).toLocaleString('pt-BR')}</small>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{log.content?.slice(0, 200)}{log.content?.length > 200 ? '...' : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 10. Falhas Recorrentes (se houver) */}
      {recurringFailures.length > 0 && (
        <section className="dashboard-inteligente__block block-falhas-recorrentes">
          <h2><AlertTriangle size={20} /> Falhas Recorrentes</h2>
          <ul className="maintenance-list">
            {recurringFailures.slice(0, 4).map((f, idx) => (
              <li key={idx}>
                <strong>{f.machine_name}</strong> – {f.failure_count} ocorrência(s)
                <span className="maintenance-meta">{(f.descriptions || []).join(', ')}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/diagnostic')}>
            Ver mais <ChevronRight size={14} />
          </button>
        </section>
      )}
    </div>
  );
}
