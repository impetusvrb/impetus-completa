/**
 * AIOI-P5.6 — Decision Visualization Coverage Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { DecisionVisualizationSection } from './DecisionVisualizationSection.jsx';

export function DecisionCoverageCard({ data }) {
  return (
    <DecisionVisualizationSection
      label="Decision Visualization Coverage"
      data={data}
      testId="decision-coverage-card"
    />
  );
}

export default DecisionCoverageCard;
