/**
 * AIOI-P5.6 — Enterprise Decision Visualization Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { DecisionVisualizationSection } from './DecisionVisualizationSection.jsx';

export function EnterpriseDecisionVisualizationCard({ data }) {
  return (
    <DecisionVisualizationSection
      label="Enterprise Decision Visualization"
      data={data}
      testId="enterprise-decision-visualization-card"
    />
  );
}

export default EnterpriseDecisionVisualizationCard;
