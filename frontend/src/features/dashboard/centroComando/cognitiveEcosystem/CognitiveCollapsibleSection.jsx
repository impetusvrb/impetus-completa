import React, { useState } from 'react';
import ModuleErrorBoundary from '../../../../components/ModuleErrorBoundary';
import { useCognitiveShellUi } from './CognitiveShellUiContext';
import useViewportTier from './useViewportTier';
import CognitiveEcosystemBand from './CognitiveEcosystemBand';

/**
 * Secção colapsável do ecossistema cognitivo — deve renderizar dentro de CognitivePresenceShell.
 */
export default function CognitiveCollapsibleSection({ onModeChange }) {
  const shellUi = useCognitiveShellUi();
  const tier = useViewportTier();
  const [cognitiveExpanded, setCognitiveExpanded] = useState(false);

  return (
    <div className="cc__cognitive-collapsible">
      <button
        type="button"
        className="cc__cognitive-toggle"
        onClick={() => {
          if (tier.isMobile) {
            shellUi?.openDetails?.();
            return;
          }
          setCognitiveExpanded((v) => !v);
        }}
        aria-expanded={tier.isMobile ? !!shellUi?.detailsOpen : cognitiveExpanded}
      >
        <span className="cc__cognitive-toggle-label">
          {tier.isMobile
            ? '▶ Ecossistema cognitivo vivo'
            : `${cognitiveExpanded ? '▼' : '▶'} Ecossistema cognitivo vivo`}
        </span>
        <span className="cc__cognitive-toggle-hint">
          {tier.isMobile
            ? 'abrir painel completo em bottom sheet (mesmos dados do desktop)'
            : cognitiveExpanded
              ? 'recolher camada avançada'
              : 'expandir radar, timeline e presença organizacional'}
        </span>
      </button>
      {!tier.isMobile && cognitiveExpanded && (
        <ModuleErrorBoundary moduleName="Ecossistema cognitivo">
          <CognitiveEcosystemBand onModeChange={onModeChange} />
        </ModuleErrorBoundary>
      )}
    </div>
  );
}
