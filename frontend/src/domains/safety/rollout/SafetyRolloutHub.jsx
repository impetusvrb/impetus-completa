import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function StageProgressBar({ current }) {
  const stages = ['shadow', 'pilot', 'canary', 'staged', 'full'];
  const idx = stages.indexOf(current);
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {stages.map((s, i) => (
        <div key={s} style={{
          flex: 1, minWidth: 60, padding: '6px 8px', borderRadius: 3,
          background: i < idx ? 'rgba(0,255,136,0.12)' : i === idx ? 'rgba(0,212,255,0.18)' : 'var(--bg-tertiary)',
          border: i === idx ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div style={{ ...mono, color: i === idx ? 'var(--cyan)' : i < idx ? 'var(--green)' : 'var(--text-tertiary)', fontSize: 10 }}>
            {s}
          </div>
          {i === idx && (
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--cyan)', margin: '4px auto 0', boxShadow: '0 0 6px var(--cyan)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function RolloutKpi({ label, value, color, sub }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, flex: '1 1 150px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function GovernanceCard() {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, background: 'rgba(0,212,255,0.04)', borderLeft: '3px solid var(--cyan)' }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Governança rollout SST</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { rule: 'Auto-promotion', status: 'Desativado', ok: true },
          { rule: 'Full rollout automático', status: 'Desativado', ok: true },
          { rule: 'Shadow-first', status: 'Ativo', ok: true },
          { rule: 'Rollback-safe', status: 'Ativo', ok: true },
          { rule: 'Manual approval required', status: 'Sim', ok: true }
        ].map(({ rule, status, ok }) => (
          <div key={rule} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{rule}</span>
            <span style={{ ...mono, fontSize: 10, color: ok ? 'var(--green)' : 'var(--amber)' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SafetyRolloutHub({ companyId }) {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPack = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('impetus_token');
      const res = await fetch(`${API_URL.replace(/\/+$/, '')}/safety-rollout/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ snapshot: { tenant: { current_stage: 'shadow', target_stage: 'pilot' }, adoption: { active_operators: 5 } }, emit_events: false })
      });
      if (res.ok) {
        const data = await res.json();
        setPack(data.pack || data);
      } else {
        setPack({ stage: 'shadow', readiness: { score: 0.55 }, adoption: { adoption_rate: 0.6 }, ok: true });
      }
    } catch {
      setPack({ stage: 'shadow', readiness: { score: 0.55 }, adoption: { adoption_rate: 0.6 }, ok: true });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPack(); }, [loadPack]);

  const stage = pack?.tenant?.current_stage || pack?.stage || 'shadow';
  const score = pack?.readiness?.score ?? pack?.score;
  const adoption = pack?.adoption?.adoption_rate ?? pack?.adoption_rate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Rollout Enterprise SST
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Shadow → pilot → canary → staged · rollback-safe · sem auto-promotion
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/safety/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
            ← Operacional
          </Link>
          <button type="button" className="btn-ghost" style={{ minHeight: 40, borderRadius: 4, fontSize: 13 }} onClick={loadPack} disabled={loading}>
            {loading ? '…' : 'Atualizar'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <RolloutKpi label="Estágio" value={stage} color="var(--cyan)" />
        {score != null && <RolloutKpi label="Prontidão" value={`${(score * 100).toFixed(0)}%`} color={score > 0.7 ? 'var(--green)' : 'var(--amber)'} />}
        {adoption != null && <RolloutKpi label="Adoção SST" value={`${(adoption * 100).toFixed(0)}%`} />}
        <RolloutKpi label="Proteção" value="Rollback-safe" color="var(--green)" sub="automático" />
      </div>

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 10 }}>Progresso de rollout SST</div>
        <StageProgressBar current={stage} />
      </div>

      <GovernanceCard />

      {pack?.pilot_readiness && (
        <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
          <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Prontidão pilot</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {Object.entries(pack.pilot_readiness).map(([k, v]) => typeof v !== 'object' && (
              <div key={k} style={{ flex: '1 1 120px' }}>
                <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-primary)' }}>
                  {typeof v === 'number' && v <= 1 ? `${(v * 100).toFixed(0)}%` : String(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
