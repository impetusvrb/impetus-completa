/**
 * PROMPT 32 — Final Consolidation Audit Hub
 */

import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { finalConsolidationAuditApi } from '../../../services/api';
import { RefreshCw, ClipboardCheck, AlertTriangle, Layers } from 'lucide-react';
import './FinalConsolidationHub.css';

function promptStatusClass(s) {
  if (s === 'production_on') return 'fca-prompt-on';
  if (s === 'shadow') return 'fca-prompt-shadow';
  return 'fca-prompt-off';
}

export default function FinalConsolidationHub() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('scores');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await finalConsolidationAuditApi.runAudit();
      setReport(res.data || null);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Falha na auditoria');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scores = report?.scores;
  const cls = report?.classification;

  const scoreItems = scores
    ? [
        { key: 'maturity_score_final', label: 'Maturity' },
        { key: 'architecture_score', label: 'Architecture' },
        { key: 'governance_score', label: 'Governance' },
        { key: 'ai_safety_score', label: 'AI Safety' },
        { key: 'industrial_readiness_score', label: 'Industrial' },
        { key: 'international_readiness_score', label: 'International' },
        { key: 'certification_readiness_score', label: 'Certification' }
      ]
    : [];

  return (
    <Layout>
      <div className="fca-hub">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="fca-hub__title">
              <ClipboardCheck size={24} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--cyan)' }} />
              Consolidação Final
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
              PROMPT 32 — AUDITORIA ENTERPRISE / INDUSTRIAL (READ-ONLY)
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading} style={{ borderRadius: 4 }}>
            <RefreshCw size={16} /> Reauditar
          </button>
        </div>

        {error && (
          <div className="impetus-card" style={{ marginTop: 16, borderColor: 'var(--red)', padding: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)', fontSize: 12 }}>{error}</span>
          </div>
        )}

        {loading && !report ? (
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 16 }}>
            A executar auditoria de consolidação…
          </p>
        ) : (
          report && (
            <>
              <div className="impetus-card" style={{ padding: 16, marginTop: 16, borderRadius: 4 }}>
                <div className="fca-classification">{cls?.classification_label || '—'}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 8 }}>
                  Score global: {scores?.overall_weighted ?? '—'}% · Prompts ON:{' '}
                  {report.prompt_validation?.production_on_count}/{report.prompt_validation?.total}
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
                  {report.executive_report?.summary_pt}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'scores', label: 'Scores', icon: Layers },
                  { id: 'prompts', label: 'Prompts 1–32', icon: ClipboardCheck },
                  { id: 'risks', label: 'Riscos & Debt', icon: AlertTriangle }
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

              {tab === 'scores' && (
                <div className="fca-scores-grid">
                  {scoreItems.map((s) => (
                    <div key={s.key} className="fca-score-card">
                      <div className="fca-score-card__label">{s.label}</div>
                      <div className="fca-score-card__value">{scores[s.key]}%</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'prompts' && (
                <div style={{ overflowX: 'auto', marginTop: 12, border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                  <table className="data-table" style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Código</th>
                        <th>Título</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.prompt_validation?.prompts || []).map((p) => (
                        <tr key={p.prompt_id}>
                          <td>{p.prompt_id}</td>
                          <td>{p.code}</td>
                          <td>{p.title}</td>
                          <td className={promptStatusClass(p.status)}>{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'risks' && (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 2, fontSize: 14, color: 'var(--cyan)' }}>
                    RISCOS REMANESCENTES
                  </h3>
                  <ul style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {(report.remaining_risks || []).map((r) => (
                      <li key={r.id}>
                        [{r.severity}] {r.title}
                      </li>
                    ))}
                  </ul>
                  <h3 style={{ fontFamily: 'var(--font-display)', letterSpacing: 2, fontSize: 14, color: 'var(--cyan)' }}>
                    DÉBITO RESIDUAL ({report.residual_debt?.total_items} itens)
                  </h3>
                  <ul style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {(report.residual_debt?.items || []).map((d) => (
                      <li key={d.id}>
                        {d.id}: {d.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )
        )}
      </div>
    </Layout>
  );
}
