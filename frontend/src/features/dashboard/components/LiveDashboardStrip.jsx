/**
 * Bloco embutido no /app: resumo do Dashboard Vivo + prévia da orquestração (liderança).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, RefreshCw, ArrowRight, ListTodo } from 'lucide-react';
import { liveDashboard } from '../../../services/api';
import { canUseTaskOrchestrationUser } from '../../../utils/roleUtils';
import './LiveDashboardStrip.css';

export default function LiveDashboardStrip({ variant = 'exec' }) {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('impetus_user') || '{}');
    } catch {
      return {};
    }
  })();

  if ((user?.role || '').toLowerCase() === 'admin') return null;

  const [state, setState] = useState(null);
  const [fetchErr, setFetchErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await liveDashboard.getState();
      if (data?.ok) {
        setState(data);
        setFetchErr(null);
      } else {
        setFetchErr(data?.error || 'Indisponível');
      }
    } catch (e) {
      setFetchErr(e.response?.data?.error || e.message || 'Erro de rede');
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [load]);

  const orch = state?.capabilities?.task_orchestration && state?.orchestration;
  const planItems = (state?.orchestration?.items || []).slice(0, 4);
  const showOrchPreview = orch && planItems.length > 0;

  return (
    <section className={`live-dash-strip live-dash-strip--${variant}`} aria-label="Dashboard Vivo">
      <div className="live-dash-strip__top">
        <div>
          <h2 className="live-dash-strip__title">
            <Zap size={20} aria-hidden />
            Dashboard Vivo · IA operacional
            <span className="live-dash-strip__badge">Tempo real</span>
          </h2>
          {state?.intelligent_summary ? (
            <p className="live-dash-strip__summary">{state.intelligent_summary}</p>
          ) : (
            <p className="live-dash-strip__summary">
              {fetchErr
                ? 'Não foi possível carregar o painel inteligente. Verifique se o backend está atualizado e acesse o painel completo.'
                : 'Carregando visão operacional ao vivo…'}
            </p>
          )}
          {state?.signals && (
            <div className="live-dash-strip__metrics">
              <span>
                Tarefas abertas: <strong>{state.signals.tasks?.open ?? '—'}</strong>
              </span>
              <span>
                Atrasadas: <strong>{state.signals.tasks?.overdue ?? '—'}</strong>
              </span>
              <span>
                Alertas: <strong>{state.signals.alerts?.open ?? '—'}</strong>
              </span>
            </div>
          )}
          {fetchErr && state == null && <p className="live-dash-strip__err">{fetchErr}</p>}
        </div>
        <div className="live-dash-strip__actions">
          <button type="button" className="live-dash-strip__link live-dash-strip__link--ghost" onClick={() => load()} title="Atualizar">
            <RefreshCw size={14} /> Atualizar
          </button>
          <Link to="/app/dashboard-vivo" className="live-dash-strip__link">
            Painel completo · histórico e ações
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {canUseTaskOrchestrationUser(user) && (
        <div className="live-dash-strip__orch">
          <h3 className="live-dash-strip__orch-title">
            <ListTodo size={16} />
            Orquestração de tarefas (supervisor · coordenador · gerente · diretor · CEO)
          </h3>
          <p className="live-dash-strip__orch-hint">
            Plano sugerido pela IA a partir de tarefas e alertas reais. Confirme ações sensíveis no painel completo.
          </p>
          {showOrchPreview ? (
            <ul className="live-dash-strip__orch-list">
              {planItems.map((item) => (
                <li key={item.id} className="live-dash-strip__orch-item">
                  <span className={`live-dash-strip__pri live-dash-strip__pri--${item.priority === 'alta' ? 'alta' : item.priority === 'media' ? 'media' : 'baixa'}`}>
                    {item.priority}
                  </span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
          ) : state ? (
            <p className="live-dash-strip__orch-hint" style={{ marginBottom: 0 }}>
              Sem tarefas em aberto para priorizar agora. Abra o painel completo para histórico, sugestões e confirmação de ações.
            </p>
          ) : null}
        </div>
      )}

      {!canUseTaskOrchestrationUser(user) && (
        <p className="live-dash-strip__orch-hint" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          Orquestração automática de tarefas é exclusiva da liderança (supervisor a CEO). Use o painel completo para sua visão operacional.
        </p>
      )}
    </section>
  );
}
