import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function RiskLevelBadge({ level }) {
  const color =
    level === 'CRITICAL' || level === 'VERY_HIGH' ? 'var(--red)' :
    level === 'HIGH' ? 'var(--amber)' :
    level === 'MEDIUM' ? 'var(--orange)' : 'var(--green)';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 3,
      background: `${color}22`, border: `1px solid ${color}44`,
      ...mono, color, fontSize: 10
    }}>
      {level || '—'}
    </span>
  );
}

function MatrixRow({ hazard, severity, probability, level }) {
  const riskScore = (severity ?? 0) * (probability ?? 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{hazard}</span>
      <span style={{ ...mono, color: 'var(--text-secondary)', fontSize: 10 }}>S{severity ?? '—'}</span>
      <span style={{ ...mono, color: 'var(--text-secondary)', fontSize: 10 }}>P{probability ?? '—'}</span>
      <RiskLevelBadge level={level} />
    </div>
  );
}

const SAMPLE_HAZARDS = [
  { hazard: 'Queda de nível', severity: 4, probability: 3 },
  { hazard: 'Contato elétrico', severity: 5, probability: 2 },
  { hazard: 'Vazamento químico', severity: 4, probability: 2 },
  { hazard: 'Ruído excessivo', severity: 2, probability: 4 },
  { hazard: 'Esforço repetitivo', severity: 3, probability: 5 }
];

function GheMatrixPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const evaluate = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('impetus_token');
      const res = await fetch(`${API_URL.replace(/\/+$/, '')}/safety-governance/intelligence/risk-matrix/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ rows: SAMPLE_HAZARDS })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ ok: false, error: e?.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { evaluate(); }, [evaluate]);

  const rows = result?.evaluated_rows || result?.rows || [];
  const summary = result?.summary || {};

  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>GHE — Matriz de Risco SST</span>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={evaluate} disabled={loading}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>

      {summary.critical_count != null && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { label: 'Críticos', value: summary.critical_count, color: 'var(--red)' },
            { label: 'Altos', value: summary.high_count, color: 'var(--amber)' },
            { label: 'Médios', value: summary.medium_count, color: 'var(--orange)' },
            { label: 'Baixos', value: summary.low_count, color: 'var(--green)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="impetus-card" style={{ padding: '8px 12px', borderRadius: 3, flex: '1 1 80px' }}>
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{label}</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color }}>{value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border-default)' }}>
            <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Perigo</span>
            <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Sev</span>
            <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Prob</span>
            <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Nível</span>
          </div>
          {rows.map((r, i) => (
            <MatrixRow key={i} hazard={r.hazard || r.description} severity={r.severity} probability={r.probability} level={r.risk_level || r.level} />
          ))}
        </div>
      ) : (
        loading ? (
          <p style={{ ...mono, color: 'var(--text-secondary)', margin: 0 }}>Calculando matriz de risco…</p>
        ) : null
      )}
    </div>
  );
}

function SstCompliancePanel() {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Compliance SST — APR · PT · LOTO · EPI</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {[
          { label: 'APR abertas', value: '—', color: 'var(--amber)' },
          { label: 'PT ativas', value: '—', color: 'var(--cyan)' },
          { label: 'LOTO ativas', value: '—', color: 'var(--orange)' },
          { label: 'EPI pendentes', value: '—', color: 'var(--text-secondary)' }
        ].map(({ label, value, color }) => (
          <div key={label} className="impetus-card" style={{ padding: '8px 12px', borderRadius: 3, flex: '1 1 120px' }}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{label}</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color }}>{value}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, marginBottom: 0 }}>
        Integração com registros operacionais SST ativa. Dados exibidos ao conectar à API de campo.
      </p>
    </div>
  );
}

function IncidentMetricsPanel() {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Incidentes & Tendências</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {[
          { label: 'Incidentes mês', value: '—' },
          { label: 'Taxa incidentes', value: '—', unit: '/1000h' },
          { label: 'Dias sem acidentes', value: '—', color: 'var(--green)' },
          { label: 'CIPA reuniões', value: '—' }
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="impetus-card" style={{ padding: '8px 12px', borderRadius: 3, flex: '1 1 120px' }}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>{label}</div>
            <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}>
              {value}{unit && <span style={{ fontSize: 11, marginLeft: 2, color: 'var(--text-secondary)' }}>{unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SafetyGovernanceHub({ companyId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            Governança SST
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            GHE · Matriz risco · APR/PT/LOTO · EPI · Incidentes · Compliance
          </p>
        </div>
        <Link to="/app/safety/operational" className="btn-ghost" style={{ minHeight: 40, padding: '0 12px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: 13 }}>
          ← Operacional
        </Link>
      </div>

      <GheMatrixPanel />
      <SstCompliancePanel />
      <IncidentMetricsPanel />
    </div>
  );
}
