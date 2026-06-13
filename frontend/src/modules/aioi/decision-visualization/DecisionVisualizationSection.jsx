/**
 * AIOI-P5.6 — Secção de renderização passiva (sem transformação)
 */

import React from 'react';
import styles from './styles/DecisionVisualization.module.css';

function formatLabel(key) {
  return String(key).replace(/_/g, ' ');
}

export function DecisionVisualizationSection({ label, data, testId }) {
  const entries =
    data && typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data)
      : [];

  return (
    <section
      className={styles.card}
      data-testid={testId}
      aria-label={label}
    >
      <h3 className={styles.cardTitle}>{label}</h3>
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

export default DecisionVisualizationSection;
