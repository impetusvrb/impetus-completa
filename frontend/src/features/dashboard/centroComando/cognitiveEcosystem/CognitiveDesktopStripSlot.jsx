import React from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import useViewportTier from './useViewportTier';
import CognitiveGlobalStrip from './CognitiveGlobalStrip';

/**
 * Desktop (≥1024px): topo always-exposed — INC-013R (motores visíveis, sem toggle).
 */
export default function CognitiveDesktopStripSlot() {
  const tier = useViewportTier();
  const { pulse } = useCognitivePulseContext();

  if (!tier.isDesktop || !pulse?.cognitive_core) return null;

  return (
    <CognitiveGlobalStrip
      core={pulse.cognitive_core}
      consciousness={pulse.consciousness}
      presence={pulse.global_presence}
      variant="desktop-top-exposed"
    />
  );
}
