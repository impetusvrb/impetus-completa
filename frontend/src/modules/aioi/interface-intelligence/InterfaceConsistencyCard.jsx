/**
 * AIOI-P5.7 — Interface Consistency Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { InterfaceIntelligenceSection } from './InterfaceIntelligenceSection.jsx';

export function InterfaceConsistencyCard({ data }) {
  return (
    <InterfaceIntelligenceSection
      label="Interface Consistency"
      data={data}
      testId="interface-consistency-card"
    />
  );
}

export default InterfaceConsistencyCard;
