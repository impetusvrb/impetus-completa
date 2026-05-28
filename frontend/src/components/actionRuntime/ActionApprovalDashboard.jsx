/**
 * PROMPT 24 — Centro de Aprovações IA (HITL Action Runtime).
 */

import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../Layout';
import { actionRuntimeApi } from '../../services/api';
import { CheckCircle2, XCircle, RotateCcw, Shield, ListTree, RefreshCw, AlertTriangle } from 'lucide-react';
import './ActionApprovalDashboard.css';

function riskClass(level) {
  const v = String(level || '').toUpperCase();
  if (v === 'CRITICAL' || v === 'HIGH') return 'ar-hitl-risk ar-hitl-risk--high';
  if (v === 'MEDIUM') return 'ar-hitl-risk ar-hitl-risk--medium';
  return 'ar-hitl-risk ar-hitl-risk--low';
}

function formatTs(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('pt-BR');
  } catch {
    return String(ts);
  }
}

function parseJsonField(val) {
  if (val == null) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

export default function ActionApprovalDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [pending, setPending] = useState([]);
  const [traces, setTraces] = useState([]);
  const [actingId, setActingId] = useState(null);
  const [rejectReason, setRejectReason] = useState({});
  const [tab, setTab] = useState('pending');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hRes, pRes, tRes] = await Promise.all([
        actionRuntimeApi.getHealth(),
        actionRuntimeApi.getPendingApprovals({ limit: 100 }),
        actionRuntimeApi.getTraces({ limit: 80 })
      ]);
      setHealth(hRes.data?.health || null);
      if (!hRes.data?.tenant?.runtime_active) {
        setError('inactive');
      }
      setPending(pRes.data?.items || []);
      setTraces(tRes.data?.items || []);
      if (pRes.data?.table_missing) {
        setError('migration');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id) => {
    setActingId(id);
    try {
      await actionRuntimeApi.approve(id);
      await load();
    } catch (e) {
      window.alert(e.response?.data?.message || e.response?.data?.error || 'Falha na aprovação');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = rejectReason[id] || '';
    setActingId(id);
    try {
      await actionRuntimeApi.reject(id, { reason });
      await load();
    } catch (e) {
      window.alert(e.response?.data?.error || 'Falha na rejeição');
    } finally {
      setActingId(null);
    }
  };

  const handleRollback = async (traceId) => {
    if (!window.confirm(`Reverter execução ${traceId}?`)) return;
    setActingId(traceId);
    try {
      await actionRuntimeApi.rollback(traceId);
      await load();
    } catch (e) {
      window.alert(e.response?.data?.error || e.response?.data?.reason || 'Rollback indisponível');
    } finally {
      setActingId(null);
    }
  };

  const mode = health?.mode || '—';

  return (
    <Layout>
      <div className="ar-hitl-page">
        <header className="screen-header ar-hitl-header">
          <div>
            <p className="ar-hitl-eyebrow">ACTION RUNTIME · HITL</p>
            <h1 className="ar-hitl-title">Centro de Aprovações IA</h1>
            <p className="ar-hitl-sub">
              Execução supervisionada — nenhuma mutação sem aprovação humana (modo:{' '}
              <span className="ar-hitl-mono">{mode}</span>)
            </p>
          </div>
          <button type="button" className="btn btn-ghost ar-hitl-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={16} aria-hidden />
            Atualizar
          </button>
        </header>

        {error === 'inactive' && (
          <div className="impetus-card ar-hitl-banner ar-hitl-banner--warn">
            <AlertTriangle size={18} aria-hidden />
            <span>
              Action Runtime inactivo para este tenant. Verifique{' '}
              <code className="ar-hitl-mono">OPERATIONAL_TOOL_CALLING_ENABLED</code> e flags de piloto.
            </span>
          </div>
        )}

        {error === 'migration' && (
          <div className="impetus-card ar-hitl-banner ar-hitl-banner--warn">
            <AlertTriangle size={18} aria-hidden />
            <span>Tabelas HITL ausentes — aplicar migração ai_action_runtime_migration.sql.</span>
          </div>
        )}

        {error && error !== 'inactive' && error !== 'migration' && (
          <div className="impetus-card ar-hitl-banner ar-hitl-banner--warn">{error}</div>
        )}

        <div className="ar-hitl-kpis">
          <div className="impetus-card ar-hitl-kpi">
            <Shield size={18} className="ar-hitl-kpi-icon" aria-hidden />
            <span className="ar-hitl-kpi-label">MODO</span>
            <span className="ar-hitl-kpi-value ar-hitl-mono">{mode}</span>
          </div>
          <div className="impetus-card ar-hitl-kpi">
            <ListTree size={18} className="ar-hitl-kpi-icon" aria-hidden />
            <span className="ar-hitl-kpi-label">PENDENTES</span>
            <span className="ar-hitl-kpi-value ar-hitl-mono">{pending.length}</span>
          </div>
          <div className="impetus-card ar-hitl-kpi">
            <span className="ar-hitl-kpi-label">FERRAMENTAS</span>
            <span className="ar-hitl-kpi-value ar-hitl-mono">{health?.policies?.length ?? '—'}</span>
          </div>
        </div>

        <div className="ar-hitl-tabs">
          <button
            type="button"
            className={tab === 'pending' ? 'ar-hitl-tab ar-hitl-tab--active' : 'ar-hitl-tab'}
            onClick={() => setTab('pending')}
          >
            Fila de aprovação
          </button>
          <button
            type="button"
            className={tab === 'traces' ? 'ar-hitl-tab ar-hitl-tab--active' : 'ar-hitl-tab'}
            onClick={() => setTab('traces')}
          >
            Rastreio de execução
          </button>
        </div>

        {loading ? (
          <p className="ar-hitl-mono ar-hitl-loading">A carregar fila HITL…</p>
        ) : tab === 'pending' ? (
          <div className="impetus-card ar-hitl-panel">
            {pending.length === 0 ? (
              <p className="ar-hitl-empty ar-hitl-mono">Nenhuma ação pendente de aprovação.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table ar-hitl-table">
                  <thead>
                    <tr>
                      <th>Ferramenta</th>
                      <th>Risco</th>
                      <th>Explicação</th>
                      <th>Pedido</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((row) => {
                      const expl = parseJsonField(row.explainability);
                      const args = parseJsonField(row.tool_args);
                      return (
                        <tr key={row.id}>
                          <td className="ar-hitl-mono">{row.tool_name}</td>
                          <td>
                            <span className={riskClass(row.risk_level)}>{row.risk_level}</span>
                          </td>
                          <td>
                            <span className="ar-hitl-explain">{expl.summary || expl.explain_template || '—'}</span>
                            <pre className="ar-hitl-args ar-hitl-mono">{JSON.stringify(args, null, 0).slice(0, 200)}</pre>
                          </td>
                          <td className="ar-hitl-mono">{formatTs(row.created_at)}</td>
                          <td className="ar-hitl-actions">
                            <button
                              type="button"
                              className="btn ar-hitl-btn-approve"
                              disabled={actingId === row.id}
                              onClick={() => handleApprove(row.id)}
                            >
                              <CheckCircle2 size={14} aria-hidden />
                              Aprovar
                            </button>
                            <input
                              type="text"
                              className="ar-hitl-reject-input"
                              placeholder="Motivo (opcional)"
                              value={rejectReason[row.id] || ''}
                              onChange={(e) =>
                                setRejectReason((s) => ({ ...s, [row.id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-danger ar-hitl-btn-reject"
                              disabled={actingId === row.id}
                              onClick={() => handleReject(row.id)}
                            >
                              <XCircle size={14} aria-hidden />
                              Rejeitar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="impetus-card ar-hitl-panel">
            {traces.length === 0 ? (
              <p className="ar-hitl-empty ar-hitl-mono">Sem traces registados.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table ar-hitl-table">
                  <thead>
                    <tr>
                      <th>Trace</th>
                      <th>Ferramenta</th>
                      <th>Estado</th>
                      <th>Modo</th>
                      <th>Quando</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces.map((row) => (
                      <tr key={row.id}>
                        <td className="ar-hitl-mono ar-hitl-trace-id">{row.trace_id}</td>
                        <td className="ar-hitl-mono">{row.tool_name}</td>
                        <td>
                          <span className={`ar-hitl-status ar-hitl-status--${row.status}`}>{row.status}</span>
                        </td>
                        <td className="ar-hitl-mono">{row.mode}</td>
                        <td className="ar-hitl-mono">{formatTs(row.created_at)}</td>
                        <td>
                          {row.status === 'executed' && row.rollback_available && mode === 'on' ? (
                            <button
                              type="button"
                              className="btn btn-ghost ar-hitl-btn-rollback"
                              disabled={actingId === row.trace_id || !!row.rolled_back_at}
                              onClick={() => handleRollback(row.trace_id)}
                            >
                              <RotateCcw size={14} aria-hidden />
                              Rollback
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
