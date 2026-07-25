import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import useWhisperScrollPersistence from './useWhisperScrollPersistence';
import useWhisperFocusArbitration from './useWhisperFocusArbitration';
import whisperSemanticTier from './whisperSemanticTier';

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

export default function CognitiveOmniPresence({ scrollPersistence = false }) {
  const { pulse, loading } = useCognitivePulseContext();
  const whispersRef = useRef(null);
  const whisperPinned = useWhisperScrollPersistence(scrollPersistence, whispersRef);
  const focusArbitrationEnabled = scrollPersistence && whisperPinned;
  const [idx, setIdx] = useState(0);
  const [persistEnter, setPersistEnter] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [msgPhase, setMsgPhase] = useState(null);
  const prevPinnedRef = useRef(false);
  const global = pulse?.global_whispers?.filter((w) => w.channel === 'global' || !w.channel) || [];
  const presenceAlive = pulse?.global_presence?.alive === true || global.length > 0;

  useEffect(() => {
    if (global.length < 2) return undefined;
    const mood = pulse?.ambient?.mood;
    const ms = mood === 'crisis' ? 3000 : 4800;
    const t = setInterval(() => setIdx((i) => (i + 1) % global.length), ms);
    return () => clearInterval(t);
  }, [global.length, pulse?.ambient?.mood]);

  const statusText = useMemo(
    () =>
      loading
        ? 'AGUARDANDO SINCRONIZAÇÃO…'
        : global.length
          ? global[idx]?.text
          : pulse?.consciousness?.active_phrase || 'PRESENÇA COGNITIVA ONLINE',
    [loading, global, idx, pulse?.consciousness?.active_phrase]
  );

  const whisperPriority = global.length ? global[idx]?.priority : 'low';
  const semanticTier = whisperSemanticTier(loading ? 'low' : whisperPriority);

  useEffect(() => {
    if (whisperPinned && !prevPinnedRef.current) {
      setPersistEnter(true);
      setDisplayText(statusText);
      setMsgPhase(null);
      prevPinnedRef.current = true;
      const t = setTimeout(() => setPersistEnter(false), 180);
      return () => clearTimeout(t);
    }
    if (!whisperPinned) {
      prevPinnedRef.current = false;
      setPersistEnter(false);
      setMsgPhase(null);
    }
    return undefined;
  }, [whisperPinned, statusText]);

  useEffect(() => {
    if (!whisperPinned) return undefined;
    if (statusText === displayText) return undefined;
    setMsgPhase('out');
    let fadeInTimer;
    const fadeOutTimer = setTimeout(() => {
      setDisplayText(statusText);
      setMsgPhase('in');
      fadeInTimer = setTimeout(() => setMsgPhase(null), 130);
    }, 95);
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(fadeInTimer);
    };
  }, [statusText, whisperPinned, displayText]);

  const whisperFocusMode = useWhisperFocusArbitration({
    enabled: focusArbitrationEnabled,
    whisperRef: whispersRef,
    messageKey: `${idx}:${statusText}`,
  });

  if (!presenceAlive && !loading) return null;

  const shownText = whisperPinned ? displayText || statusText : statusText;
  const msgPhaseClass =
    whisperPinned && msgPhase === 'out'
      ? ' cog-whispers__item--msg-out'
      : whisperPinned && msgPhase === 'in'
        ? ' cog-whispers__item--msg-in'
        : '';

  return (
    <div className="cog-omnipresence-zone" aria-label="Onipresença Cognitiva" role="status">
      <span className="cog-omnipresence-zone__label">ONIPRESENÇA COGNITIVA</span>
      <div
        ref={whispersRef}
        className={`cog-whispers cog-whispers--multi${
          whisperPinned ? ' cog-whispers--scroll-persist' : ''
        }${persistEnter ? ' cog-whispers--persist-enter' : ''}${
          whisperFocusMode === 'yielding' ? ' cog-whispers--focus-yielding' : ''
        }${whisperFocusMode === 'dismissed' ? ' cog-whispers--focus-dismissed' : ''}`}
        aria-live="polite"
        data-whisper-pinned={whisperPinned ? 'true' : 'false'}
        data-whisper-focus-mode={whisperPinned ? whisperFocusMode : 'inline'}
      >
        <span
          className={`cog-whispers__item cog-whispers__item--active cog-whispers__item--semantic-${semanticTier}${msgPhaseClass}`}
          data-whisper-priority={whisperPriority || 'low'}
        >
          {shownText}
        </span>
      </div>
    </div>
  );
}
