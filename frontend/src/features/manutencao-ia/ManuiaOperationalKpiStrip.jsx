import React, { useEffect, useState } from 'react';
import { manutencaoIa } from '../../services/api';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' };

function Kpi({ label, value, accent }) {
  return (
    <div className="impetus-card" style={{ padding: '0.75rem 1rem', borderRadius: 4, flex: '1 1 140px', minWidth: 120 }}>
      <div style={mono}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', color: accent || 'var(--text-primary)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

export function ManuiaOperationalKpiStrip({ machinesCount = 0, emergencyCount = 0, refreshKey = 0 }) {
  const [sessions, setSessions] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sRes, hRes] = await Promise.all([
          manutencaoIa.getSessions().catch(() => ({ data: { sessions: [] } })),
          manutencaoIa.getHealth().catch(() => ({ data: null }))
        ]);
        if (!cancelled) {
          setSessions(sRes.data?.sessions || sRes.data || []);
          setHealth(hRes.data || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const sessionList = Array.isArray(sessions) ? sessions : [];
  const openSessions = sessionList.filter((s) => !s.concluded_at && !s.ended_at).length;

  return (
    <section style={{ marginBottom: 16 }} aria-label="KPIs operacionais ManuIA">
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Runtime ManuIA · sessões · ativos</div>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Sincronizando KPIs…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Kpi label="Máquinas cadastradas" value={machinesCount} accent="var(--cyan)" />
          <Kpi label="Sessões abertas" value={openSessions} accent="var(--green)" />
          <Kpi label="Sessões (total)" value={sessionList.length} />
          <Kpi label="Emergências" value={emergencyCount} accent={emergencyCount > 0 ? 'var(--amber)' : undefined} />
          <Kpi
            label="Backend"
            value={health?.ok ? 'ONLINE' : '—'}
            accent={health?.ok ? 'var(--green)' : 'var(--amber)'}
          />
        </div>
      )}
    </section>
  );
}

export default ManuiaOperationalKpiStrip;
