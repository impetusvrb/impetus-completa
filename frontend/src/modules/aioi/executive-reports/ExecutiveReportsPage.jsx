/**
 * AIOI-P5.8 — Executive Reports Page (READ ONLY · visão consolidada P5.3)
 */

import React from 'react';
import styles from './styles/ExecutiveReports.module.css';
import ExecutiveReportsContainer from './ExecutiveReportsContainer.jsx';

export function ExecutiveReportsPage({ companyId, fetcher }) {
  return (
    <main
      className={styles.page}
      data-testid="executive-reports-page"
      aria-label="Enterprise Executive Reports"
    >
      <header className={styles.header}>
        <p className={styles.headerEyebrow}>AIOI · P5.8</p>
        <h1 className={styles.headerTitle}>Executive Reports</h1>
        <p className={styles.headerMeta}>
          Visão consolidada · view models soberanos · somente visualização · zero exportação
        </p>
      </header>
      <ExecutiveReportsContainer companyId={companyId} fetcher={fetcher} />
    </main>
  );
}

export default ExecutiveReportsPage;
