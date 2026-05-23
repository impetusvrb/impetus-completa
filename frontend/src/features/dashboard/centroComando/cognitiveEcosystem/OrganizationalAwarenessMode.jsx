import React, { useEffect } from 'react';
import CognitiveNeuralMesh from './CognitiveNeuralMesh';
import LiveOrgMap from './LiveOrgMap';

export default function OrganizationalAwarenessMode({ payload, pulse, onClose, onModeChange }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!payload) return null;

  return (
    <div className="cog-awareness" role="dialog" aria-modal="true" aria-label={payload.title}>
      <div className="cog-awareness__backdrop" onClick={onClose} aria-hidden />
      <div className="cog-awareness__viewport">
        <header className="cog-awareness__head">
          <div>
            <span className="cog-awareness__tag">IMPETUS · COGNITIVE CORE</span>
            <h2>{payload.title}</h2>
            <p>{payload.subtitle}</p>
          </div>
          <button type="button" className="cog-awareness__close" onClick={onClose}>
            ESC · FECHAR
          </button>
        </header>

        <div className="cog-awareness__energy">
          <span>Organismo: {payload.energy?.organism_state}</span>
          <span>Moral {payload.energy?.morale_pct}%</span>
          <span>Energia ops {payload.energy?.operational_energy_pct}%</span>
          <span>Sincronia {payload.energy?.sync_pct}%</span>
          <span>Pressão {payload.energy?.pressure}</span>
        </div>

        <div className="cog-awareness__grid">
          <div className="cog-awareness__panel cog-awareness__panel--neural">
            <CognitiveNeuralMesh graph={payload.neural_graph} />
          </div>
          <div className="cog-awareness__panel cog-awareness__panel--map">
            <LiveOrgMap orgMap={payload.org_map} />
          </div>
          <div className="cog-awareness__panel cog-awareness__panel--heat">
            <h3>Calor operacional setorial</h3>
            <div className="cog-awareness__heat-grid">
              {(payload.sectors_live || []).map((s) => (
                <div
                  key={s.id}
                  className="cog-awareness__heat-cell"
                  style={{ '--heat': `${s.intensity}%` }}
                >
                  <span>{s.name}</span>
                  <strong>{s.intensity}%</strong>
                  <em>{s.label}</em>
                </div>
              ))}
            </div>
          </div>
        </div>

        {pulse?.emergent_insights?.items?.length > 0 && (
          <div className="cog-awareness__emergent">
            <span className="cog-awareness__tag">HIPÓTESES EMERGENTES</span>
            {pulse.emergent_insights.items.slice(0, 3).map((h, i) => (
              <p key={i}>{h.hypothesis}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
