import React from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import useViewportTier from './useViewportTier';
import CognitiveGlobalStrip from './CognitiveGlobalStrip';

/**
 * Mobile: faixa compacta após conteúdo operacional principal (CERT-01.1).
 * Deve renderizar dentro de CognitivePresenceShell (contexto UI).
 */
export default function CognitiveMobileStripSlot() {
  const tier = useViewportTier();
  const { pulse } = useCognitivePulseContext();

  if (!tier.isMobile || !pulse?.cognitive_core) return null;

  return (
    <CognitiveGlobalStrip
      core={pulse.cognitive_core}
      consciousness={pulse.consciousness}
      presence={pulse.global_presence}
      compact
    />
  );
}
