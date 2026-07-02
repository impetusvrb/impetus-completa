import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { manutencaoIa } from '../../services/api';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)'
};

function Kpi({ label, value, accent }) {
  return (
    <div
      className="impetus-card manuia-runtime-kpi"
      style={{ padding: '0.6rem 0.85rem', borderRadius: 4, flex: '1 1 100px', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
    >
      <div style={mono}>{label}</div>
      <div style={{ fontSize: 20, fontFamily: 'var(--font-mono)', color: accent || 'var(--text-primary)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function useMobileCollapsedDefault() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return isMobile;
}

export function ManuiaOperationalKpiStrip({ machinesCount = 0, emergencyCount = 0, refreshKey = 0 }) {
  const isMobile = useMobileCollapsedDefault();
  const [expanded, setExpanded] = useState(() => !isMobile);
  const [sessions, setSessions] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMobile) setExpanded(false);
  }, [isMobile]);

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
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const sessionList = Array.isArray(sessions) ? sessions : [];
  const openSessions = sessionList.filter((s) => !s.concluded_at && !s.ended_at).length;
  const isOnline = health?.ok === true;
  const compactLine = loading
    ? 'Sincronizando…'
    : [
        isOnline ? '● Online' : '● Offline',
        `${machinesCount} máquinas`,
        `${openSessions} sessões`,
        emergencyCount > 0 ? `${emergencyCount} emerg.` : null
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <section className={`manuia-runtime-panel${expanded ? ' manuia-runtime-panel--expanded' : ''}`} aria-label="Runtime ManuIA">
      <button
        type="button"
        className="manuia-runtime-panel__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={`manuia-runtime-panel__status${isOnline ? ' manuia-runtime-panel__status--online' : ''}`} aria-hidden />
        <span className="manuia-runtime-panel__title">Runtime</span>
        {!expanded && <span className="manuia-runtime-panel__summary">{compactLine}</span>}
        <span className="manuia-runtime-panel__chev" aria-hidden>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {expanded && (
        <div className="manuia-runtime-panel__body">
          {loading ? (
            <p className="manuia-runtime-panel__loading">Sincronizando KPIs…</p>
          ) : (
            <div className="manuia-runtime-panel__kpis">
              <Kpi label="Máquinas" value={machinesCount} accent="var(--cyan)" />
              <Kpi label="Sessões abertas" value={openSessions} accent="var(--green)" />
              <Kpi label="Sessões (total)" value={sessionList.length} />
              <Kpi label="Emergências" value={emergencyCount} accent={emergencyCount > 0 ? 'var(--amber)' : undefined} />
              <Kpi
                label="Backend"
                value={isOnline ? 'ONLINE' : '—'}
                accent={isOnline ? 'var(--green)' : 'var(--amber)'}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ManuiaOperationalKpiStrip;
