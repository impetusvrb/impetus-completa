/**
 * AIOI-P5.4 — Renderização passiva de secções do contrato (sem transformação)
 */

import React from 'react';
import styles from './styles/ExecutiveCockpit.module.css';

function formatLabel(key) {
  return String(key).replace(/_/g, ' ');
}

export function ExecutiveDataSection({ label, data, testId }) {
  const entries =
    data && typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data)
      : [];

  return (
    <section
      className={styles.section}
      data-testid={testId}
      aria-label={label}
    >
      <h3 className={styles.sectionTitle}>{label}</h3>
      {entries.length === 0 ? (
        <p className={styles.empty} aria-live="polite">
          —
        </p>
      ) : (
        <dl className={styles.fieldList}>
          {entries.map(([key, value]) => (
            <div key={key} className={styles.fieldRow}>
              <dt className={styles.fieldKey}>{formatLabel(key)}</dt>
              <dd className={styles.fieldValue}>
                {value === null || value === undefined ? '—' : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export default ExecutiveDataSection;
