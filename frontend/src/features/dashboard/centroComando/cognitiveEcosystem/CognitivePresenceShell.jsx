import React, { useState, useEffect } from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import OrganizationalAwarenessMode from './OrganizationalAwarenessMode';
import CognitiveGlobalStrip from './CognitiveGlobalStrip';
import CognitiveOmniPresence from './CognitiveOmniPresence';
import './cognitivePresence.css';
import './cognitiveEcosystem.css';

/**
 * Presença global da IA — ambiente que respira, sussurros, modo consciência total.
 */
export default function CognitivePresenceShell({ children, warRoomMode = 'normal', onModeChange }) {
  const { pulse } = useCognitivePulseContext();
  const [awarenessOpen, setAwarenessOpen] = useState(false);
  const ambient = pulse?.ambient;
  const mood = ambient?.mood || 'stable';
  const speed = ambient?.scanner_speed ?? 1;

  const dataAttrs = {
    'data-cog-mood': mood,
    'data-cog-scanner': String(speed),
    'data-cog-glow': String(ambient?.glow_intensity ?? 0.4),
    'data-war-room': warRoomMode
  };

  return (
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

      <CognitiveGlobalStrip core={pulse?.cognitive_core} presence={pulse?.global_presence} />
      <CognitiveOmniPresence />

      <button
        type="button"
        className="cog-awareness-trigger"
        onClick={() => setAwarenessOpen(true)}
        title="Organizational Awareness Mode"
      >
        <span className="cog-awareness-trigger__dot" />
        CONSCIÊNCIA TOTAL
      </button>

      <div className="cog-presence-content">{children}</div>

      {awarenessOpen && (
        <OrganizationalAwarenessMode
          payload={pulse?.awareness_mode}
          pulse={pulse}
          onClose={() => setAwarenessOpen(false)}
          onModeChange={onModeChange}
        />
      )}
    </div>
  );
}
