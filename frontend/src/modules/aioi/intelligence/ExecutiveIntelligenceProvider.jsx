/**
 * AIOI-P7.0 — Executive Intelligence Provider (FOUNDATION ONLY · READ ONLY)
 *
 * Contexto institucional para futuras capacidades cognitivas — sem processamento.
 */

import React, { useMemo } from 'react';
import { ExecutiveIntelligenceContext } from './ExecutiveIntelligenceContext.jsx';
import ExecutiveIntelligenceMetadata from './ExecutiveIntelligenceMetadata.jsx';
import {
  EXECUTIVE_INTELLIGENCE_VERSION,
  getExecutiveIntelligenceMetadata,
  isExecutiveIntelligenceReady
} from './ExecutiveIntelligenceService.js';
import styles from './ExecutiveIntelligence.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveIntelligenceProvider({ children }) {
  const metadata = useMemo(() => getExecutiveIntelligenceMetadata(), []);
  const ready = isExecutiveIntelligenceReady();
  const version = EXECUTIVE_INTELLIGENCE_VERSION;

  const contextValue = useMemo(
    () => ({
      metadata,
      version,
      ready,
      readOnly: true
    }),
    [metadata, ready]
  );

  return (
    <ExecutiveIntelligenceContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-intelligence-provider"
        data-intelligence-ready={ready ? 'true' : 'false'}
        data-intelligence-version={version}
        aria-label="Executive Intelligence Provider"
      >
        <ExecutiveIntelligenceMetadata metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveIntelligenceContext.Provider>
  );
}

export default ExecutiveIntelligenceProvider;
