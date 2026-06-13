/**
 * AIOI-P7.2 — Executive Intelligence Activation Provider (ACTIVATION FRAMEWORK ONLY · READ ONLY)
 *
 * Infraestrutura institucional de ativação cognitiva — sem activação efectiva.
 */

import React, { useMemo } from 'react';
import { ExecutiveIntelligenceActivationContext } from './ExecutiveIntelligenceActivationContext.jsx';
import ExecutiveIntelligenceActivationIndicators from './ExecutiveIntelligenceActivationIndicators.jsx';
import {
  getExecutiveIntelligenceActivationMetadata,
  isExecutiveIntelligenceActivationReady,
  isExecutiveIntelligenceActivationSupported
} from './ExecutiveIntelligenceActivationService.js';
import styles from './ExecutiveIntelligenceActivation.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveIntelligenceActivationProvider({ children }) {
  const metadata = useMemo(() => getExecutiveIntelligenceActivationMetadata(), []);
  const ready = isExecutiveIntelligenceActivationReady();
  const supported = isExecutiveIntelligenceActivationSupported();

  const contextValue = useMemo(
    () => ({
      metadata,
      ready,
      supported
    }),
    [metadata, ready, supported]
  );

  return (
    <ExecutiveIntelligenceActivationContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-intelligence-activation-provider"
        data-activation-ready={ready ? 'true' : 'false'}
        data-activation-supported={supported ? 'true' : 'false'}
        aria-label="Executive Intelligence Activation Provider"
      >
        <ExecutiveIntelligenceActivationIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveIntelligenceActivationContext.Provider>
  );
}

export default ExecutiveIntelligenceActivationProvider;
