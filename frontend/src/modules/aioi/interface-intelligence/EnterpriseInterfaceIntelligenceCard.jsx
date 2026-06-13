/**
 * AIOI-P5.7 — Enterprise Interface Intelligence Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { InterfaceIntelligenceSection } from './InterfaceIntelligenceSection.jsx';

export function EnterpriseInterfaceIntelligenceCard({ data }) {
  return (
    <InterfaceIntelligenceSection
      label="Enterprise Interface Intelligence"
      data={data}
      testId="enterprise-interface-intelligence-card"
    />
  );
}

export default EnterpriseInterfaceIntelligenceCard;
