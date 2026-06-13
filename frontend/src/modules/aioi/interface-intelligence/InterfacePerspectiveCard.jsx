/**
 * AIOI-P5.7 — Interface Perspective Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { InterfaceIntelligenceSection } from './InterfaceIntelligenceSection.jsx';

export function InterfacePerspectiveCard({ data }) {
  return (
    <InterfaceIntelligenceSection
      label="Interface Perspective"
      data={data}
      testId="interface-perspective-card"
    />
  );
}

export default InterfacePerspectiveCard;
