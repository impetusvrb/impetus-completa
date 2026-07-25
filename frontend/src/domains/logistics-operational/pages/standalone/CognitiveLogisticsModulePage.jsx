import React from 'react';
import CognitiveLogisticsModule from '../../modules/cognitive-logistics/CognitiveLogisticsModule.jsx';
import { useCognitiveLogisticsFoundation } from '../../modules/cognitive-logistics/useCognitiveLogisticsFoundation.js';
import { WMS_OPERATIONAL_MODULES } from '../../routes/wmsModuleRegistry.js';

const meta = WMS_OPERATIONAL_MODULES.find((m) => m.id === 'cognitive_logistics');

/**
 * OPM-008 — Cognitive Logistics & Decision Intelligence.
 * Camada cognitiva — não executa operações transacionais.
 */
export default function CognitiveLogisticsModulePage() {
  const foundation = useCognitiveLogisticsFoundation();
  return (
    <CognitiveLogisticsModule
      title={meta?.label || 'Logística Cognitiva'}
      description={
        meta?.description ||
        'Cognitive Logistics & Decision Intelligence · preditivo · explicável · OPM-008'
      }
      {...foundation}
    />
  );
}
