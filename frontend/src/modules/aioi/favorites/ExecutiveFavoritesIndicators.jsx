/**
 * AIOI-P6.7 — Executive Favorites Indicators (UI EXPERIENCE ONLY · READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveFavorites.module.css';

export function ExecutiveFavoritesIndicators({ metadata }) {
  const count = metadata?.favorites_count ?? 0;
  const active = count > 0;

  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-favorites-indicators"
      aria-label="Executive Favorites Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P6.7 · EXECUTIVE FAVORITES</p>
      <div className={styles.metricsGrid} role="list" aria-label="Favorites Metrics">
        <div className={styles.metricItem} data-testid="executive-favorites-active" role="listitem">
          <span className={styles.metricLabel}>Favorites Active</span>
          <span className={styles.metricValue}>{active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-favorites-count" role="listitem">
          <span className={styles.metricLabel}>Favorites Count</span>
          <span className={styles.metricValue}>{count}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveFavoritesIndicators;
