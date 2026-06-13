/**
 * AIOI-P5.6 — Decision Visualization Page (READ ONLY · primeira UI dedicada)
 */

import React from 'react';
import styles from './styles/DecisionVisualization.module.css';
import DecisionVisualizationContainer from './DecisionVisualizationContainer.jsx';

export function DecisionVisualizationPage({ companyId, fetcher }) {
  return (
    <main
      className={styles.page}
      data-testid="decision-visualization-page"
      aria-label="Enterprise Decision Visualization"
    >
      <header className={styles.header}>
        <p className={styles.headerEyebrow}>AIOI · P5.6</p>
        <h1 className={styles.headerTitle}>Decision Visualization</h1>
        <p className={styles.headerMeta}>
          View model soberano · somente visualização · zero execução
        </p>
      </header>
      <DecisionVisualizationContainer companyId={companyId} fetcher={fetcher} />
    </main>
  );
}

export default DecisionVisualizationPage;
