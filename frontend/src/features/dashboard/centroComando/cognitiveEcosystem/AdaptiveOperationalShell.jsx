import React from 'react';
import { useCognitivePulseContext } from './CognitivePulseContext';
import CognitiveNeuralMesh from './CognitiveNeuralMesh';

/**
 * Envolve o grid operacional com foco autônomo e ponte neural visual.
 */
export default function AdaptiveOperationalShell({ children, mainWidgets = [] }) {
  const { pulse } = useCognitivePulseContext();
  const focus = pulse?.autonomous_focus;
  const layout = focus?.layout_hint || 'balanced_cognitive';
  const intensity = focus?.visual_intensity || 'normal';
  const topPriority = focus?.priority_stack?.[0]?.id;

  return (
    <div
      className={`cc-adaptive cc-adaptive--${layout.replace(/_/g, '-')} cc-adaptive--${intensity}`}
      data-priority={topPriority || 'sync'}
    >
      <div className="cc-adaptive__bridge" aria-hidden>
        <CognitiveNeuralMesh graph={pulse?.neural_graph} />
      </div>
      <div className="cc-adaptive__content">{children}</div>
    </div>
  );
}
