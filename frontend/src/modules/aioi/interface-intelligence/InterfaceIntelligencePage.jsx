/**
 * AIOI-P5.7 — Interface Intelligence Page (READ ONLY · UI dedicada)
 */

import React from 'react';
import styles from './styles/InterfaceIntelligence.module.css';
import InterfaceIntelligenceContainer from './InterfaceIntelligenceContainer.jsx';

export function InterfaceIntelligencePage({ companyId, fetcher }) {
  return (
    <main
      className={styles.page}
      data-testid="interface-intelligence-page"
      aria-label="Enterprise Interface Intelligence"
    >
      <header className={styles.header}>
        <p className={styles.headerEyebrow}>AIOI · P5.7</p>
        <h1 className={styles.headerTitle}>Interface Intelligence</h1>
        <p className={styles.headerMeta}>
          View model soberano · somente visualização · zero execução
        </p>
      </header>
      <InterfaceIntelligenceContainer companyId={companyId} fetcher={fetcher} />
    </main>
  );
}

export default InterfaceIntelligencePage;
