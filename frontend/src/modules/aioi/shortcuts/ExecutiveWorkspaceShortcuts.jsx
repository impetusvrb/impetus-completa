/**
 * AIOI-P6.8 — Executive Workspace Shortcuts (UI EXPERIENCE ONLY · READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveShortcuts.module.css';

export function ExecutiveWorkspaceShortcuts({ metadata }) {
  const count = metadata?.shortcuts_count ?? 0;
  const active = count > 0;

  return (
    <aside
      className={styles.shortcutsBar}
      data-testid="executive-workspace-shortcuts"
      aria-label="Executive Workspace Shortcuts"
    >
      <p className={styles.shortcutsEyebrow}>AIOI-P6.8 · EXECUTIVE SHORTCUTS</p>
      <div className={styles.metricsGrid} role="list" aria-label="Shortcuts Metrics">
        <div className={styles.metricItem} data-testid="executive-shortcuts-active" role="listitem">
          <span className={styles.metricLabel}>Shortcuts Active</span>
          <span className={styles.metricValue}>{active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-shortcuts-count" role="listitem">
          <span className={styles.metricLabel}>Shortcuts Count</span>
          <span className={styles.metricValue}>{count}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveWorkspaceShortcuts;
