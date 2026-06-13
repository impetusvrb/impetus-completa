/**
 * AIOI-P5.7 — Interface Coverage Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { InterfaceIntelligenceSection } from './InterfaceIntelligenceSection.jsx';

export function InterfaceCoverageCard({ data }) {
  return (
    <InterfaceIntelligenceSection
      label="Interface Coverage"
      data={data}
      testId="interface-coverage-card"
    />
  );
}

export default InterfaceCoverageCard;
