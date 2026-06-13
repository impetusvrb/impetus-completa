/**
 * AIOI-P5.6 — Decision Perspective Card (READ ONLY · P5.3 contract.data)
 */

import React from 'react';
import { DecisionVisualizationSection } from './DecisionVisualizationSection.jsx';

export function DecisionPerspectiveCard({ data }) {
  return (
    <DecisionVisualizationSection
      label="Decision Perspective"
      data={data}
      testId="decision-perspective-card"
    />
  );
}

export default DecisionPerspectiveCard;
