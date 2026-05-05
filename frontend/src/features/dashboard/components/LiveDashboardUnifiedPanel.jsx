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

/** Resumo com blocos (\\n\\n) e **negrito** simples — alinhado ao motor executivo do backend. */
function FormattedIntelligentSummary({ text }) {
  if (!text || typeof text !== 'string') return null;
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="live-dash-summary-formatted">
      {blocks.map((block, i) => {
        const parts = block.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="live-dash-summary-para">
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**') ? (
                <strong key={j}>{p.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{p}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
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
  const dynamicSurface = display?.dynamic_surface || null;

  const renderDynamicBody = (block) => {
    if (!block || typeof block !== 'object') return null;
    const viz = block?.visualization;
    const data = block?.data || {};
    if (viz === 'alert') return <p className="live-dash-dyn-body live-dash-dyn-body--alert">{data.message || 'Ação imediata recomendada.'}</p>;
    if (viz === 'kpi') return <p className="live-dash-dyn-body live-dash-dyn-body--kpi">{data.value ?? 'Sem volume suficiente'}{data.growth_label ? ` · ${data.growth_label}` : ''}</p>;
    if (viz === 'line' || viz === 'bar' || viz === 'pie') return <p className="live-dash-dyn-body live-dash-dyn-body--chart">{data.message || 'Tendência detectada para acompanhamento.'}</p>;
    if (viz === 'table') return <p className="live-dash-dyn-body live-dash-dyn-body--table">{data.message || 'Itens múltiplos detectados para análise.'}</p>;
    if (viz === 'fallback') return <p className="live-dash-dyn-body live-dash-dyn-body--fallback">{data.message || 'Nenhum evento relevante detectado.'}</p>;
    return <p className="live-dash-dyn-body">{data.message || 'Insight contextual gerado para o seu perfil.'}</p>;
  };

  const groupTitleMap = {
    problemas_criticos: 'Problemas críticos',
    atencoes: 'Atenções',
    tendencias: 'Tendências',
    recomendacoes: 'Recomendações',
    acoes: 'Ações'
  };

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
                ? 'Cartões e métricas vêm do seu perfil Impetus (cargo + setor + hierarquia). Sem cadastro completo, o painel deixa isso explícito.'
                : 'Personalizado por perfil e escopo; atualização automática a cada ~20 s.'}
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
          {display.personalization && (
            <section
              className={`live-dash-personalization live-dash-personalization--${display.personalization.data_sufficiency || 'full'}`}
              aria-label="Contexto do seu perfil"
            >
              <div className="live-dash-personalization-head">
                <span className="live-dash-pers-badge">{display.personalization.profile_label || display.personalization.profile_code}</span>
                {display.personalization.functional_area_label && (
                  <span className="live-dash-pers-meta">Setor funcional: {display.personalization.functional_area_label}</span>
                )}
                {display.personalization.department_name && (
                  <span className="live-dash-pers-meta">Departamento: {display.personalization.department_name}</span>
                )}
                {display.personalization.job_title && (
                  <span className="live-dash-pers-meta">Função: {display.personalization.job_title}</span>
                )}
              </div>
              <p className="live-dash-pers-message">{display.personalization.user_message}</p>
              {Array.isArray(display.personalization.gaps) && display.personalization.gaps.length > 0 && (
                <div className="live-dash-pers-gaps">
                  <strong>Dados em falta ou genéricos:</strong>
                  <ul>
                    {display.personalization.gaps
                      .map((g, gidx) => (g == null ? '' : typeof g === 'string' ? g : String(g)))
                      .filter(Boolean)
                      .map((g, gidx) => (
                      <li key={`gap-${gidx}-${g.slice(0, 40)}`}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="live-dash-summary" aria-live="polite">
            <h2 className="live-dash-visually-hidden">Resumo inteligente</h2>
            <FormattedIntelligentSummary text={display.intelligent_summary} />
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
                {display.data_sources.communications_open_in_scope != null && (
                  <li>
                    Comunicações em aberto (no seu escopo):{' '}
                    <strong>{display.data_sources.communications_open_in_scope}</strong>
                  </li>
                )}
              </ul>
            </section>
          )}

          {Array.isArray(display.alerts_preview) && display.alerts_preview.filter(Boolean).length > 0 && (
            <section className="live-dash-alerts-preview">
              <h3>Alertas recentes</h3>
              <ul>
                {display.alerts_preview.filter((a) => a && typeof a === 'object').map((a, idx) => (
                  <li key={a.id != null ? String(a.id) : `alert-${idx}`}>
                    <span className="live-dash-sev">{a.severidade || '—'}</span> {a.titulo || a.tipo_alerta}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {display.focus_moment && (
            <section className={`live-dash-focus live-dash-focus--${display.focus_moment.status || 'estavel'}`} aria-label="Foco do momento">
              <h3>{display.focus_moment.title}</h3>
              <p>{display.focus_moment.message}</p>
              {Array.isArray(display.focus_moment.cta) && display.focus_moment.cta.length > 0 && (
                <div className="live-dash-focus-cta">
                  {display.focus_moment.cta.slice(0, 3).map((cta) => (
                    <button key={cta} type="button" className="live-dash-btn live-dash-btn--small">{cta}</button>
                  ))}
                </div>
              )}
            </section>
          )}

          {dynamicSurface?.groups && (
            <section className="live-dash-dynamic" aria-label="Blocos dinâmicos por relevância">
              {Object.entries(dynamicSurface.groups)
                .filter(([, blocks]) => Array.isArray(blocks) && blocks.length > 0)
                .map(([groupKey, blocks]) => (
                  <div key={groupKey} className="live-dash-dynamic-group">
                    <h3>{groupTitleMap[groupKey] || groupKey}</h3>
                    <div className="live-dash-dynamic-grid">
                      {blocks
                        .filter((b) => b != null && typeof b === 'object')
                        .map((block, bidx) => (
                        <article
                          key={block.id != null ? String(block.id) : `dyn-${groupKey}-${bidx}`}
                          className={`live-dash-dynamic-card live-dash-dynamic-card--${block.severity || 'baixa'}`}
                        >
                          <div className="live-dash-dynamic-head">
                            <h4>{block.title != null ? String(block.title) : '—'}</h4>
                            {block.requires_action && <span className="live-dash-dynamic-action-tag">Ação sugerida</span>}
                          </div>
                          <p className="live-dash-dynamic-sub">
                            {block.subtitle != null ? String(block.subtitle) : ''}
                          </p>
                          {renderDynamicBody(block)}
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
            </section>
          )}

          {Array.isArray(display.smart_questions) && display.smart_questions.filter((q) => q != null && String(q).trim() !== '').length > 0 && (
            <section className="live-dash-suggestions">
              <h3>Perguntas inteligentes do seu perfil</h3>
              <ul>
                {display.smart_questions
                  .map((q, qidx) => (q == null ? null : String(q)))
                  .filter(Boolean)
                  .map((q, qidx) => (
                  <li key={`${q}-${qidx}`}>{q}</li>
                ))}
              </ul>
            </section>
          )}

          {orch && (
            <>
              <section className="live-dash-orchestration">
                <h3>{display.orchestration?.plan_title || 'Plano do dia — orquestração'}</h3>
                <p className="live-dash-orchestration-hint">
                  {display.orchestration?.plan_hint ||
                    'Prioridades a partir de dados reais e do seu nível hierárquico. Ações só após sua confirmação.'}
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
                        {list
                          .filter((item) => item != null && typeof item === 'object')
                          .map((item, iidx) => (
                          <li key={item.id != null ? String(item.id) : `plan-${pri}-${iidx}`} className="live-dash-plan-item">
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
                              {(item.actions || [])
                                .filter((act) => act != null && typeof act === 'object')
                                .map((act, aidx) => (
                                <button
                                  key={act.id != null ? String(act.id) : `act-${pri}-${iidx}-${aidx}`}
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

              {(display.orchestration.suggestions || []).filter((s) => s && typeof s === 'object').length > 0 && (
                <section className="live-dash-suggestions">
                  <h3>Sugestões da IA</h3>
                  <ul>
                    {display.orchestration.suggestions
                      .filter((s) => s && typeof s === 'object')
                      .map((s, six) => (
                      <li key={s.id != null ? String(s.id) : `sug-${six}`}>{s.text}</li>
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
                O <strong>plano do dia com orquestração</strong> aparece apenas para <strong>supervisor</strong>,{' '}
                <strong>coordenador</strong>, <strong>gerente</strong>, <strong>diretor</strong> e <strong>CEO</strong>. Operadores
                e técnicos de chão de fábrica não veem este bloco — o conteúdo muda por nível (estratégico, tático ou supervisão).
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
