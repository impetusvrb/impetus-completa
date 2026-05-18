import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEnvironmentPilotRolloutPack } from './environmentPilotRolloutApi.js';
import { EnvironmentPilotIndicators } from './EnvironmentPilotIndicators.jsx';
import { resolveEnvironmentAudienceBand, resolveEnvironmentUxDensity } from '../navigation/environmentAudienceNavigation.js';

export default function EnvironmentPilotOperationalDashboard() {
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);

  let band = 'operator';
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    band = resolveEnvironmentAudienceBand(u);
  } catch {
    /* ignore */
  }
  const density = resolveEnvironmentUxDensity(band);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchEnvironmentPilotRolloutPack({
        menu_count: 6,
        view_count: 2,
        user: { role: band }
      });
      if (alive) {
        setPack(data);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [band]);

  if (loading) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Carregando pilot rollout…
      </p>
    );
  }

  if (!pack) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)' }}>Pacote pilot indisponível — verifique sessão e API.</p>
        <Link to="/app/environment/operational" className="btn-ghost" style={{ marginTop: 12, display: 'inline-flex', borderRadius: 4 }}>
          Voltar
        </Link>
      </div>
    );
  }

  const dec = pack.operational_decision_hint || {};
  const journey = pack.user_journey?.audience_journey || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ margin: 0, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-accent)' }}>
        Pilot — Maturidade Operacional Ambiental
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
        Audiência {band} · densidade {density} · shadow-only
      </p>

      <EnvironmentPilotIndicators pack={pack} />

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          Decisão assistiva
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{dec.action || 'REMAIN_IN_SHADOW'}</p>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
          promote_stage: {String(dec.promote_stage)} · manual_only: true
        </p>
      </div>

      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          Jornada contextual
        </p>
        <p style={{ margin: '8px 0 0', color: 'var(--text-primary)', fontSize: 13 }}>
          {(journey.manifest_ids || []).slice(0, 6).join(' · ') || '—'}
        </p>
      </div>

      <Link to="/app/environment/operational" className="btn-ghost" style={{ alignSelf: 'flex-start', borderRadius: 4 }}>
        Voltar ao hub
      </Link>
    </div>
  );
}
