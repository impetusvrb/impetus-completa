/**
 * AIOI-P8.0 — Executive Cognitive Runtime Provider (RUNTIME FOUNDATION ONLY · READ ONLY)
 *
 * Separação formal Capability Layer → Runtime Layer — sem execução cognitiva.
 */

import React, { useMemo } from 'react';
import { ExecutiveCognitiveRuntimeContext } from './ExecutiveCognitiveRuntimeContext.jsx';
import ExecutiveCognitiveRuntimeIndicators from './ExecutiveCognitiveRuntimeIndicators.jsx';
import {
  getExecutiveCognitiveRuntimeMetadata,
  isExecutiveCognitiveRuntimeReady,
  isExecutiveCognitiveRuntimeSupported
} from './ExecutiveCognitiveRuntimeService.js';
import styles from './ExecutiveCognitiveRuntime.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveCognitiveRuntimeProvider({ children }) {
  const metadata = useMemo(() => getExecutiveCognitiveRuntimeMetadata(), []);
  const ready = isExecutiveCognitiveRuntimeReady();
  const supported = isExecutiveCognitiveRuntimeSupported();
  const active = metadata.runtime_active === true;

  const contextValue = useMemo(
    () => ({
      metadata,
      ready,
      supported,
      active
    }),
    [metadata, ready, supported, active]
  );

  return (
    <ExecutiveCognitiveRuntimeContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-cognitive-runtime-provider"
        data-runtime-ready={ready ? 'true' : 'false'}
        data-runtime-supported={supported ? 'true' : 'false'}
        data-runtime-active={active ? 'true' : 'false'}
        aria-label="Executive Cognitive Runtime Provider"
      >
        <ExecutiveCognitiveRuntimeIndicators metadata={metadata} supported={supported} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveCognitiveRuntimeContext.Provider>
  );
}

export default ExecutiveCognitiveRuntimeProvider;
