import React, { useMemo, useState, useCallback } from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import { CognitiveShellUiProvider } from './CognitiveShellUiContext';
import OrganizationalAwarenessMode from './OrganizationalAwarenessMode';
import CognitiveGlobalStrip from './CognitiveGlobalStrip';
import CognitiveOmniPresence from './CognitiveOmniPresence';
import CognitiveCoreDetailSheet from './CognitiveCoreDetailSheet';
import CognitiveEcosystemDetailContent from './CognitiveEcosystemDetailContent';
import useViewportTier from './useViewportTier';
import './cognitivePresence.css';
import './cognitiveEcosystem.css';

/**
 * Presença global da IA — ambiente, faixa cognitiva e modos de consciência.
 * CERT-01.1: convergência Desktop × Mobile via CognitiveShellUiContext.
 */
export default function CognitivePresenceShell({ children, warRoomMode = 'normal', onModeChange }) {
  const { pulse } = useCognitivePulseContext();
  const tier = useViewportTier();
  const [awarenessOpen, setAwarenessOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [modeOverride, setModeOverride] = useState(null);

  const suggested = pulse?.operational_mode || 'normal';
  const activeMode = modeOverride || suggested;

  const handleMode = useCallback(
    (id) => {
      setModeOverride(id);
      onModeChange?.(id);
    },
    [onModeChange]
  );

  const shellUi = useMemo(
    () => ({
      tier,
      openAwareness: () => setAwarenessOpen(true),
      closeAwareness: () => setAwarenessOpen(false),
      openDetails: () => setDetailsOpen(true),
      closeDetails: () => setDetailsOpen(false),
      awarenessOpen,
      detailsOpen
    }),
    [tier, awarenessOpen, detailsOpen]
  );

  const ambient = pulse?.ambient;
  const mood = ambient?.mood || 'stable';
  const speed = ambient?.scanner_speed ?? 1;

  const dataAttrs = {
    'data-cog-mood': mood,
    'data-cog-scanner': String(speed),
    'data-cog-glow': String(ambient?.glow_intensity ?? 0.4),
    'data-war-room': warRoomMode,
    'data-viewport-tier': tier.isMobile ? 'mobile' : tier.isTablet ? 'tablet' : 'desktop'
  };

  const useCompactCognitive = tier.isMobile;

  return (
    <CognitiveShellUiProvider value={shellUi}>
      <div className="cog-presence-root" {...dataAttrs}>
        <div className="cog-ambient" aria-hidden>
          <div className="cog-ambient__breath" />
          <div className="cog-ambient__grid" />
          <div className="cog-ambient__scanner-v" />
          <div className="cog-ambient__scanner-h" />
          <div className="cog-ambient__glow-orb cog-ambient__glow-orb--1" />
          <div className="cog-ambient__glow-orb cog-ambient__glow-orb--2" />
          <div className="cog-ambient__particles" />
        </div>

        {tier.isTablet && (
          <CognitiveGlobalStrip
            core={pulse?.cognitive_core}
            consciousness={pulse?.consciousness}
            presence={pulse?.global_presence}
            variant="tablet"
          />
        )}
        {!tier.isMobile && <CognitiveOmniPresence />}

        <div className="cog-presence-content">{children}</div>

        <CognitiveCoreDetailSheet
          open={useCompactCognitive && detailsOpen}
          onClose={() => setDetailsOpen(false)}
          title="COGNITIVE CORE — DETALHES"
        >
          <CognitiveEcosystemDetailContent
            pulse={pulse}
            activeMode={activeMode}
            modeOverride={modeOverride}
            suggestedMode={suggested}
            onModeChange={handleMode}
          />
        </CognitiveCoreDetailSheet>

        {awarenessOpen && (
          <OrganizationalAwarenessMode
            payload={pulse?.awareness_mode}
            pulse={pulse}
            onClose={() => setAwarenessOpen(false)}
            onModeChange={onModeChange}
          />
        )}
      </div>
    </CognitiveShellUiProvider>
  );
}
