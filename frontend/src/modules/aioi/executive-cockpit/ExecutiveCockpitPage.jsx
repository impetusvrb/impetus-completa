/**
 * AIOI-P5.4 — Executive Cockpit Page (READ ONLY · primeira interface visual AIOI)
 */

import React from 'react';
import styles from './styles/ExecutiveCockpit.module.css';
import ExecutiveCockpitContainer from './ExecutiveCockpitContainer.jsx';

export function ExecutiveCockpitPage({ companyId, fetcher }) {
  return (
    <main
      className={styles.page}
      data-testid="executive-cockpit-page"
      aria-label="Enterprise Executive Cockpit"
    >
      <header className={styles.header}>
        <p className={styles.headerEyebrow}>AIOI · P5.4</p>
        <h1 className={styles.headerTitle}>Enterprise Executive Cockpit</h1>
        <p className={styles.headerMeta}>
          View models soberanos · somente visualização · zero execução
        </p>
      </header>
      <ExecutiveCockpitContainer companyId={companyId} fetcher={fetcher} />
    </main>
  );
}

export default ExecutiveCockpitPage;
