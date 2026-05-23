import React, { useState, useEffect, useMemo } from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';

function WhisperLine({ channel, className }) {
  const { pulse } = useCognitivePulseContext();
  const [idx, setIdx] = useState(0);
  const items = useMemo(
    () => pulse?.global_presence?.whispers_by_channel?.[channel] || pulse?.global_whispers?.filter((w) => w.channel === channel) || [],
    [pulse, channel]
  );

  useEffect(() => {
    if (items.length < 2) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5500);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const w = items[idx];
  return (
    <span className={`cog-omni ${className} cog-omni--${w.priority || 'low'}`} aria-live="polite">
      <span className="cog-omni__dot" aria-hidden />
      {w.text}
    </span>
  );
}

export function CognitiveOmniHeader() {
  return <WhisperLine channel="header" className="cog-omni--header" />;
}

export function CognitiveOmniRail() {
  return <WhisperLine channel="rail" className="cog-omni--rail" />;
}

export function CognitiveOmniFooter() {
  return <WhisperLine channel="footer" className="cog-omni--footer" />;
}

export default function CognitiveOmniPresence() {
  const { pulse } = useCognitivePulseContext();
  const [idx, setIdx] = useState(0);
  const global = pulse?.global_whispers?.filter((w) => w.channel === 'global' || !w.channel) || [];

  useEffect(() => {
    if (global.length < 2) return undefined;
    const mood = pulse?.ambient?.mood;
    const ms = mood === 'crisis' ? 3000 : 4800;
    const t = setInterval(() => setIdx((i) => (i + 1) % global.length), ms);
    return () => clearInterval(t);
  }, [global.length, pulse?.ambient?.mood]);

  if (!global.length) return null;

  return (
    <div className="cog-whispers cog-whispers--multi" aria-live="polite">
      <span className={`cog-whispers__item cog-whispers__item--active cog-whispers__item--${global[idx]?.priority || 'low'}`}>
        {global[idx]?.text}
      </span>
    </div>
  );
}
