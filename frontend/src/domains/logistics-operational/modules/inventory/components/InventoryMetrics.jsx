import React from 'react';
import InventoryOperationalIntelligencePanel from '../InventoryOperationalIntelligencePanel.jsx';

/**
 * OPM-002A Reference Module — inteligência operacional (heurísticas locais).
 * Preparado para integração futura com Cognitive Center / IA (OPM-008).
 */
export default function InventoryMetrics({ intelligence, Panel = null }) {
  if (Panel) return <Panel intelligence={intelligence} />;
  return <InventoryOperationalIntelligencePanel intelligence={intelligence} />;
}
