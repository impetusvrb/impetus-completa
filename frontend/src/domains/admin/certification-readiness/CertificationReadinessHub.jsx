/**
 * PROMPT 31 — Certification Readiness Hub
 */

import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { certificationReadinessApi } from '../../../services/api';
import { RefreshCw, Award, AlertTriangle, Map, FileCheck } from 'lucide-react';
import './CertificationReadinessHub.css';

function statusClass(s) {
  if (s === 'met') return 'cr-status-met';
  if (s === 'partial') return 'cr-status-partial';
  return 'cr-status-gap';
}

export default function CertificationReadinessHub() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('gaps');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await certificationReadinessApi.runAssessment();
      setReport(res.data || null);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Falha na avaliação');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const gap = report?.gap_analysis;
  const matrix = report?.remediation_matrix;
  const roadmap = report?.certification_roadmap;
  const fwScores = report?.framework_scores || {};

  return (
    <Layout>
      <div className="cr-hub">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="cr-hub__title">
              <Award size={24} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--cyan)' }} />
              Certification Readiness
            </h1>
            <p className="cr-hub__subtitle">
              ISO 27001 · ISO 42001 · SOC 2 · IEC 62443 — AVALIAÇÃO TÉCNICA (NÃO É CERTIFICAÇÃO FORMAL)
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading} style={{ borderRadius: 4 }}>
            <RefreshCw size={16} /> Reavaliar
          </button>
        </div>

        {error && (
          <div className="impetus-card" style={{ marginBottom: 16, borderColor: 'var(--red)', padding: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', fontSize: 12 }}>{error}</span>
          </div>
        )}

        {loading && !report ? (
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>A executar auditoria de readiness…</p>
        ) : (
          report && (
            <>
              <div className="impetus-card" style={{ padding: 16, marginBottom: 16, borderRadius: 4 }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div className="cr-score-ring">{gap?.overall_score ?? '—'}%</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                      SCORE GLOBAL
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <div>Met: {gap?.met_count} · Partial: {gap?.partial_count} · Gaps: {gap?.gap_count}</div>
                    <div>Evidências: {report.evidence_inventory?.present_count}/{report.evidence_inventory?.evidence_count}</div>
                    <div>Estágio maturidade: {roadmap?.current_maturity_stage}</div>
                  </div>
                </div>
              </div>

              <div className="cr-fw-grid">
                {Object.entries(fwScores).map(([id, v]) => (
                  <div key={id} className="cr-fw-card">
                    <div className="cr-fw-card__label">{id.replace(/_/g, ' ')}</div>
                    <div className="cr-fw-card__score">{v.overall_score}%</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {v.gap_count} gaps
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'gaps', label: 'Gap analysis', icon: AlertTriangle },
                  { id: 'remediation', label: 'Remediation', icon: FileCheck },
                  { id: 'roadmap', label: 'Roadmap', icon: Map }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ borderRadius: 4, fontSize: 12 }}
                    onClick={() => setTab(t.id)}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>

              {tab === 'gaps' && (
                <div className="cr-table-wrap">
                  <table className="cr-table data-table">
                    <thead>
                      <tr>
                        <th>Controlo</th>
                        <th>Framework</th>
                        <th>Estado</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gap?.controls || []).map((c) => (
                        <tr key={c.control_id}>
                          <td>
                            {c.control_id} — {c.title}
                          </td>
                          <td>{c.framework}</td>
                          <td className={statusClass(c.status)}>{c.status}</td>
                          <td>{c.score}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'remediation' && (
                <div className="cr-table-wrap">
                  <table className="cr-table data-table">
                    <thead>
                      <tr>
                        <th>Prio</th>
                        <th>Controlo</th>
                        <th>Acção</th>
                        <th>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(matrix?.rows || []).map((r) => (
                        <tr key={r.control_id}>
                          <td className={r.priority === 'P1' ? 'cr-priority-p1' : ''}>{r.priority}</td>
                          <td>{r.control_id}</td>
                          <td>{r.remediation_action}</td>
                          <td>{r.owner_suggestion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'roadmap' && (
                <div>
                  {(roadmap?.phases || []).map((p) => (
                    <div key={p.phase} className="impetus-card" style={{ marginBottom: 12, padding: 14, borderRadius: 4 }}>
                      <div style={{ fontFamily: 'var(--font-display)', letterSpacing: 2, color: 'var(--cyan)' }}>
                        {p.phase} — {p.title}
                      </div>
                      <ul style={{ fontFamily: 'var(--font-mono)', fontSize: 12, margin: '8px 0' }}>
                        {p.milestones.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                        Exit: {p.exit_criteria}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>
    </Layout>
  );
}
