/**
 * AIOI-P5.6 — Decision Consistency Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { DecisionVisualizationSection } from './DecisionVisualizationSection.jsx';

export function DecisionConsistencyCard({ data }) {
  return (
    <DecisionVisualizationSection
      label="Decision Consistency"
      data={data}
      testId="decision-consistency-card"
    />
  );
}

export default DecisionConsistencyCard;
