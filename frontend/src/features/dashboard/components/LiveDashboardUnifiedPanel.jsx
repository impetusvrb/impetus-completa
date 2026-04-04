/**
 * Painel único: Dashboard Vivo + histórico + widgets + orquestração (sem Layout).
 * Embutido na Visão Executiva e nos demais dashboards em /app.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { liveDashboard } from '../../../services/api';
import { Zap, Clock, RefreshCw, History, AlertTriangle, CheckCircle2 } from 'lucide-react';
import '../../../pages/LiveIntelligentDashboard.css';

function priorityClass(p) {
  if (p === 'alta') return 'live-dash-priority live-dash-priority--high';
  if (p === 'media') return 'live-dash-priority live-dash-priority--mid';
  return 'live-dash-priority live-dash-priority--low';
}

function groupPlanItems(items) {
  const g = { alta: [], media: [], baixa: [] };
  for (const it of items || []) {
    const k = it.priority === 'alta' || it.priority === 'media' || it.priority === 'baixa' ? it.priority : 'baixa';
    g[k].push(it);
  }
  return g;
}

export default function LiveDashboardUnifiedPanel({ variant = 'light', hidden = false }) {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [historical, setHistorical] = useState(null);
  const [atInput, setAtInput] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [pending, setPending] = useState(null);
  const [execBusy, setExecBusy] = useState(false);

  const display = historical?.payload || live;
  const isHistorical = !!historical;
  const orch = display?.capabilities?.task_orchestration && display?.orchestration && !isHistorical;
  const planByPriority = orch ? groupPlanItems(display.orchestration?.items || []) : null;
  const sortedWidgets = [...(display?.layout?.widgets || [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  const loadLive = useCallback(async () => {
    setErr(null);
    try {
      const { data } = await liveDashboard.getState();
      if (!data?.ok) {
        setErr(data?.error || 'Não foi possível carregar o painel inteligente.');
        setLive(null);
        return;
      }
      setLive(data);
      setHistorical(null);
    } catch (e) {
      setErr(e.response?.data?.error || e.message || 'Erro de rede');
      setLive(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSnapshotsList = useCallback(async () => {
    try {
      const { data } = await liveDashboard.listSnapshots(24);
      if (data?.ok) setSnapshots(data.snapshots || []);
    } catch {
      setSnapshots([]);
    }
  }, []);

  useEffect(() => {
    if (hidden) return undefined;
    loadLive();
    loadSnapshotsList();
    const id = setInterval(loadLive, 20000);
    return () => clearInterval(id);
  }, [hidden, loadLive, loadSnapshotsList]);

  const goNow = () => {
    setHistorical(null);
    loadLive();
  };

  const loadAt = async (iso) => {
    if (!iso) return;
    setErr(null);
    try {
      const { data } = await liveDashboard.getSnapshotAt(iso);
      if (!data?.ok) {
        setErr(data?.error || 'Falha ao buscar snapshot');
        return;
      }
      if (!data.snapshot) {
        setErr('Nenhum snapshot para esse momento. Aguarde o próximo intervalo (~5 min) ou escolha outra data.');
        return;
      }
      setHistorical(data.snapshot);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  };

  const quickPast = (hours) => {
    const d = new Date(Date.now() - hours * 3600000);
    loadAt(d.toISOString());
  };

  const runExecute = async () => {
    if (!pending || !live?.orchestration_stash_key) return;
    setExecBusy(true);
    setErr(null);
    try {
      const { data } = await liveDashboard.executeOrchestration({
        stash_key: live.orchestration_stash_key,
        proposal_id: pending.proposal_id,
        action_id: pending.action_id,
        confirm: true
      });
      if (!data?.ok) {
        setErr(data?.error || 'Ação não executada');
        return;
      }
      setPending(null);
      await loadLive();
      await loadSnapshotsList();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setExecBusy(false);
    }
  };

  if (hidden) return null;

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('impetus_user') || '{}');
    } catch {
      return {};
    }
  })();
  if ((user?.role || '').toLowerCase() === 'admin') return null;

  const rootClass = `live-intelligent-dashboard live-dash-unified live-dash-unified--${variant}`;

  return (
    <div className={rootClass}>
      <header className="live-dash-header">
        <div className="live-dash-title">
          <Zap className="live-dash-title-icon" size={variant === 'exec' ? 24 : 28} aria-hidden />
          <div>
            <h1>{variant === 'exec' ? 'Operação em tempo real · IA & orquestração' : 'Dashboard vivo integrado'}</h1>
            <p className="live-dash-sub">
              {variant === 'exec'
                ? 'Integrado ao dashboard (CEO, diretor, gerente, coordenador, supervisor) — grid abaixo segue o perfil e /dashboard/personalizado'
                : 'Adaptativo · histórico · tarefas (liderança)'}
            </p>
          </div>
        </div>
        <div className="live-dash-actions">
          <button type="button" className="live-dash-btn" onClick={() => loadLive()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'live-dash-spin' : ''} /> Atualizar
          </button>
        </div>
      </header>

      <section className="live-dash-timebar" aria-label="Histórico do painel">
        <History size={18} />
        <span className="live-dash-timebar-label">Máquina do tempo</span>
        <button type="button" className="live-dash-btn live-dash-btn--ghost" onClick={goNow} disabled={!isHistorical}>
          Agora
        </button>
        <button type="button" className="live-dash-btn live-dash-btn--ghost" onClick={() => quickPast(2)}>
          −2 h
        </button>
        <button type="button" className="live-dash-btn live-dash-btn--ghost" onClick={() => quickPast(24)}>
          ~24 h
        </button>
        <input
          type="datetime-local"
          className="live-dash-dt"
          value={atInput}
          onChange={(e) => setAtInput(e.target.value)}
          aria-label="Data e hora"
        />
        <button
          type="button"
          className="live-dash-btn"
          onClick={() => {
            if (!atInput) return;
            loadAt(new Date(atInput).toISOString());
          }}
        >
          Carregar
        </button>
      </section>

      {isHistorical && historical?.captured_at && (
        <div className="live-dash-banner live-dash-banner--historical">
          <Clock size={18} />
          Snapshot de {new Date(historical.captured_at).toLocaleString('pt-BR')} — orquestração desativada nesta vista.
        </div>
      )}

      {err && (
        <div className="live-dash-banner live-dash-banner--error">
          <AlertTriangle size={18} /> {err}
        </div>
      )}

      {loading && !display && <div className="live-dash-loading">Carregando painel integrado…</div>}

      {display && (
        <>
          <section className="live-dash-summary" aria-live="polite">
            <h2 className="live-dash-visually-hidden">Resumo inteligente</h2>
            <p>{display.intelligent_summary}</p>
            <div className="live-dash-signals">
              <span>
                Tarefas abertas: <strong>{display.signals?.tasks?.open ?? '—'}</strong>
              </span>
              <span>
                Atrasadas: <strong>{display.signals?.tasks?.overdue ?? '—'}</strong>
              </span>
              <span>
                Alertas ativos: <strong>{display.signals?.alerts?.open ?? '—'}</strong>
              </span>
              <span>
                Telemetria (picos): <strong>{display.signals?.telemetry_anomalies ?? '—'}</strong>
              </span>
              <span>
                Eventos críticos: <strong>{display.signals?.critical_operational_events ?? '—'}</strong>
              </span>
              <span>
                Atualizado:{' '}
                <strong>{display.captured_at ? new Date(display.captured_at).toLocaleTimeString('pt-BR') : '—'}</strong>
              </span>
            </div>
          </section>

          {!isHistorical && display.data_sources && (
            <section className="live-dash-sources" aria-label="Fontes de dados da IA">
              <h3 className="live-dash-sources-title">Dados reais consultados nesta leitura</h3>
              <ul className="live-dash-sources-list">
                <li>
                  IMPETUS — tarefas: {display.data_sources.impetus_tasks?.open ?? '—'} abertas
                  {display.data_sources.impetus_tasks?.overdue
                    ? ` · ${display.data_sources.impetus_tasks.overdue} atrasadas`
                    : ''}
                </li>
                <li>IMPETUS — alertas operacionais: {display.data_sources.impetus_operational_alerts?.open ?? '—'} ativos</li>
                <li>
                  Telemetria PLC (última leitura/equip.):{' '}
                  {display.data_sources.plc_telemetry?.ok === false
                    ? 'indisponível'
                    : `${display.data_sources.plc_telemetry?.equipments_tracked ?? 0} equip. · ${display.data_sources.plc_telemetry?.anomalies ?? 0} fora do limite`}
                </li>
                <li>
                  PLC / sensores:{' '}
                  {display.data_sources.plc_sensors?.ok === false
                    ? 'indisponível (sem dados ou tabela)'
                    : `${display.data_sources.plc_sensors?.samples_used ?? 0} alerta(s) recente(s) considerados no plano`}
                </li>
                <li>
                  ERP / integrações: {display.data_sources.erp_integrations?.connectors ?? 0} conector(es)
                  {display.data_sources.erp_integrations?.erp_connected ? ' · ERP/MES ligado' : ''}
                  {display.data_sources.erp_integrations?.log_errors_24h
                    ? ` · ${display.data_sources.erp_integrations.log_errors_24h} falha(s) 24h`
                    : ''}
                </li>
                <li>
                  Chat Impetus (48h): {display.data_sources.chat_impetus?.operational_mentions ?? 0} menção(ões) operacional(is) em{' '}
                  {display.data_sources.chat_impetus?.messages_scanned_48h ?? 0} mensagens analisadas
                </li>
                <li>
                  Logs / auditoria (24h): {display.data_sources.audit_logs?.severe_or_failed_24h ?? 0} evento(s) relevante(s)
                </li>
              </ul>
            </section>
          )}

          {display.alerts_preview?.length > 0 && (
            <section className="live-dash-alerts-preview">
              <h3>Alertas recentes</h3>
              <ul>
                {display.alerts_preview.map((a) => (
                  <li key={a.id}>
                    <span className="live-dash-sev">{a.severidade || '—'}</span> {a.titulo || a.tipo_alerta}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {display.operational_events?.length > 0 && (
            <section className="live-dash-events-strip" aria-label="Eventos do motor operacional">
              <h3 className="live-dash-sources-title">Eventos detectados nesta leitura</h3>
              <ul className="live-dash-events-list">
                {display.operational_events.slice(0, 6).map((ev) => (
                  <li key={ev.id} className={`live-dash-event live-dash-event--${ev.severity || 'medium'}`}>
                    <span className="live-dash-event-title">{ev.title}</span>
                    {ev.detail ? <span className="live-dash-event-detail">{ev.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="live-dash-widgets" aria-label="Widgets do perfil">
            <h3>Widgets adaptativos (prioridade pelo seu setor no cadastro)</h3>
            <div className="live-dash-widget-grid">
              {sortedWidgets.map((w) => (
                <article
                  key={w.id}
                  className={[
                    'live-dash-widget-card',
                    w.highlight ? 'live-dash-widget-card--alert' : '',
                    w.pulse_level && w.pulse_level !== 'calm' ? `live-dash-widget-card--pulse-${w.pulse_level}` : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    w.pulse_scale && w.pulse_scale !== 1
                      ? { transform: `scale(${w.pulse_scale})`, zIndex: w.pulse_level === 'critical' ? 2 : 1 }
                      : undefined
                  }
                >
                  <h4>{w.label}</h4>
                  <p className="live-dash-widget-meta">{w.type}</p>
                  {w.live_metric != null && w.live_metric.value != null && (
                    <p className="live-dash-metric">
                      {w.live_metric.label}: <strong>{w.live_metric.value}</strong>
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          {orch && (
            <>
              <section className="live-dash-orchestration">
                <h3>Plano do dia · orquestração (supervisor a CEO)</h3>
                <p className="live-dash-orchestration-hint">
                  Prioridades a partir de dados reais. Ações críticas só após sua confirmação.
                </p>
                {['alta', 'media', 'baixa'].map((pri) => {
                  const list = planByPriority?.[pri] || [];
                  if (list.length === 0) return null;
                  const label =
                    pri === 'alta' ? 'Prioridade alta' : pri === 'media' ? 'Prioridade média' : 'Prioridade baixa';
                  return (
                    <div key={pri} className="live-dash-plan-group">
                      <h4 className={`live-dash-plan-group-title live-dash-plan-group-title--${pri}`}>{label}</h4>
                      <ul className="live-dash-plan">
                        {list.map((item) => (
                          <li key={item.id} className="live-dash-plan-item">
                            <div className="live-dash-plan-head">
                              <span className={priorityClass(item.priority)}>{item.priority}</span>
                              <span className="live-dash-order">#{item.suggested_order}</span>
                              <strong>{item.title}</strong>
                            </div>
                            <div className="live-dash-plan-meta">
                              {item.source && (
                                <span className="live-dash-plan-source">
                                  Fonte: {item.source}
                                  {item.context_line ? ` · ${item.context_line}` : ''}
                                  <br />
                                </span>
                              )}
                              {!item.source && item.context_line && (
                                <>
                                  {item.context_line}
                                  <br />
                                </>
                              )}
                              Responsável sugerido: {item.assignee_hint || '—'} · ~{item.eta_minutes} min
                            </div>
                            <div className="live-dash-plan-actions">
                              {(item.actions || []).map((act) => (
                                <button
                                  key={act.id}
                                  type="button"
                                  className="live-dash-btn live-dash-btn--small"
                                  onClick={() =>
                                    setPending({
                                      proposal_id: item.id,
                                      action_id: act.id,
                                      label: act.label
                                    })
                                  }
                                >
                                  {act.label}
                                </button>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>

              {(display.orchestration.suggestions || []).length > 0 && (
                <section className="live-dash-suggestions">
                  <h3>Sugestões da IA</h3>
                  <ul>
                    {display.orchestration.suggestions.map((s) => (
                      <li key={s.id}>{s.text}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {!orch && !isHistorical && display?.capabilities?.task_orchestration === false && (
            <section className="live-dash-note">
              <CheckCircle2 size={18} />
              <p>
                Visão de execução: orquestração de tarefas fica com supervisor, coordenador, gerente, diretor e CEO.
              </p>
            </section>
          )}

          {snapshots.length > 0 && (
            <section className="live-dash-snapshots-list">
              <h3>Snapshots recentes</h3>
              <ul>
                {snapshots.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="live-dash-linkish"
                      onClick={() => loadAt(new Date(s.captured_at).toISOString())}
                    >
                      {new Date(s.captured_at).toLocaleString('pt-BR')}
                    </button>
                    {s.summary_hint ? <span className="live-dash-snap-hint"> — {s.summary_hint.slice(0, 80)}…</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {pending && (
        <div className="live-dash-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="live-dash-confirm-title">
          <div className="live-dash-modal">
            <h2 id="live-dash-confirm-title">Confirmar ação</h2>
            <p>{pending.label}</p>
            <p className="live-dash-modal-warn">A IA só executa após sua aprovação explícita.</p>
            <div className="live-dash-modal-actions">
              <button type="button" className="live-dash-btn live-dash-btn--ghost" onClick={() => setPending(null)} disabled={execBusy}>
                Cancelar
              </button>
              <button type="button" className="live-dash-btn live-dash-btn--primary" onClick={runExecute} disabled={execBusy}>
                {execBusy ? 'Executando…' : 'Confirmar e executar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
