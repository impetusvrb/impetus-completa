/**
 * PROMPT 29 — Rollout Center (painel central de flags, gates e governança).
 */

import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { rolloutCenterApi } from '../../../services/api';
import { RefreshCw, Shield, Flag, GitBranch, Activity } from 'lucide-react';
import './RolloutCenterHub.css';

function modeBadge(mode) {
  const m = String(mode || 'off').toLowerCase();
  const cls = `rc-badge rc-badge--${m === 'on' ? 'on' : m === 'shadow' ? 'shadow' : m === 'audit' ? 'audit' : 'off'}`;
  return <span className={cls}>{m}</span>;
}

export default function RolloutCenterHub() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [evaluating, setEvaluating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rolloutCenterApi.getDashboard();
      setDashboard(res.data || null);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEvaluate = async (capabilityId) => {
    setEvaluating(capabilityId);
    try {
      await rolloutCenterApi.evaluateGate(capabilityId);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setEvaluating(null);
    }
  };

  const summary = dashboard?.summary || {};
  const caps = dashboard?.capabilities || [];
  const gates = dashboard?.promotion_gates || [];

  return (
    <Layout>
      <div className="rc-hub">
        <div className="rc-hub__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="rc-hub__title">
              <Flag size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--cyan)' }} />
              Rollout Center
            </h1>
            <p className="rc-hub__subtitle">
              FLAGS EFETIVAS · GATES · GOVERNANÇA · MODO {dashboard?.center_mode || '—'} · SHADOW-FIRST
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading} style={{ borderRadius: 4 }}>
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>

        {error && (
          <div className="impetus-card" style={{ marginBottom: 16, borderColor: 'var(--red)', padding: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', fontSize: 12 }}>{error}</span>
          </div>
        )}

        {loading && !dashboard ? (
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>Carregando painel…</p>
        ) : (
          <>
            <div className="rc-summary">
              <div className="rc-kpi">
                <div className="rc-kpi__label">Em produção (on)</div>
                <div className="rc-kpi__value">{summary.on ?? 0}</div>
              </div>
              <div className="rc-kpi">
                <div className="rc-kpi__label">Shadow</div>
                <div className="rc-kpi__value">{summary.shadow ?? 0}</div>
              </div>
              <div className="rc-kpi">
                <div className="rc-kpi__label">Audit</div>
                <div className="rc-kpi__value">{summary.audit ?? 0}</div>
              </div>
              <div className="rc-kpi">
                <div className="rc-kpi__label">Gates OK</div>
                <div className="rc-kpi__value">
                  {summary.gates_passing ?? 0}/{summary.gates_total ?? 0}
                </div>
              </div>
            </div>

            <div className="impetus-card" style={{ marginBottom: 16, padding: 12, borderRadius: 4 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Promoção segura: gates são advisory. Alteração de .env + <code>pm2 reload --update-env</code> apenas via deploy controlado.
              </div>
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
              <Activity size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Capacidades e flags efetivas
            </h2>
            <div className="rc-table-wrap">
              <table className="rc-table data-table">
                <thead>
                  <tr>
                    <th>Capacidade</th>
                    <th>Prompt</th>
                    <th>Modo</th>
                    <th>Pilotos</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {caps.map((c) => (
                    <tr key={c.capability_id}>
                      <td>{c.label}</td>
                      <td>{c.prompt}</td>
                      <td>{modeBadge(c.effective_mode)}</td>
                      <td>{c.pilot_tenants?.length || 0}</td>
                      <td>{c.runtime_stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
              <GitBranch size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Promotion gates
            </h2>
            <div className="rc-table-wrap">
              <table className="rc-table data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Atual</th>
                    <th>Próximo</th>
                    <th>Gate</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {gates.map((g) => (
                    <tr key={g.capability_id}>
                      <td>{g.capability_id}</td>
                      <td>{modeBadge(g.current_mode)}</td>
                      <td>{g.next_recommended ? modeBadge(g.next_recommended) : '—'}</td>
                      <td className={g.gate_passed ? 'rc-gate-ok' : 'rc-gate-fail'}>
                        {g.gate_passed ? 'PASS' : 'REVIEW'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '2px 8px', fontSize: 11, borderRadius: 3 }}
                          disabled={evaluating === g.capability_id}
                          onClick={() => handleEvaluate(g.capability_id)}
                        >
                          Revalidar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
