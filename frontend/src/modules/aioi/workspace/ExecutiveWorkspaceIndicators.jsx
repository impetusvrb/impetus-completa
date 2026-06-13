/**
 * AIOI-P6.4 / P6.5 — Executive Workspace Indicators (UI EXPERIENCE ONLY · READ ONLY)
 */

import React from 'react';
import { useExecutiveWorkspacePreferences } from './ExecutiveWorkspacePreferencesContext.jsx';
import { getIndicatorVisibility } from './ExecutiveWorkspacePreferencesService.js';
import styles from './ExecutiveWorkspace.module.css';

export function ExecutiveWorkspaceIndicators({
  workspace,
  workspaceReady,
  workspaceLevel
}) {
  const prefsCtx = useExecutiveWorkspacePreferences();
  const visibility = getIndicatorVisibility(prefsCtx?.preferences);

  return (
    <header
      className={styles.indicatorsBar}
      data-testid="executive-workspace-indicators"
      aria-label="Executive Workspace Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P6.4 · ENTERPRISE WORKSPACE</p>

      <div className={styles.metricsGrid} role="list" aria-label="Workspace Metrics">
        {visibility.workspaceStatus ? (
          <>
            <div className={styles.metricItem} data-testid="executive-workspace-modules-ready" role="listitem">
              <span className={styles.metricLabel}>Modules</span>
              <span className={styles.metricValue}>
                {workspace?.modules_ready ?? 0}/{workspace?.modules_total ?? 0}
              </span>
            </div>
            <div className={styles.metricItem} data-testid="executive-workspace-deep-links-ready" role="listitem">
              <span className={styles.metricLabel}>Deep Links</span>
              <span className={styles.metricValue}>
                {workspace?.deep_links_ready ?? 0}/{workspace?.deep_links_total ?? 0}
              </span>
            </div>
          </>
        ) : null}
        {visibility.navigationStatus ? (
          <div className={styles.metricItem} data-testid="executive-workspace-navigation-ready" role="listitem">
            <span className={styles.metricLabel}>Navigation</span>
            <span className={styles.metricValue}>{workspace?.navigation_ready ? 'ready' : 'pending'}</span>
          </div>
        ) : null}
        {visibility.governanceStatus ? (
          <div className={styles.metricItem} data-testid="executive-workspace-governance-ready" role="listitem">
            <span className={styles.metricLabel}>Governance</span>
            <span className={styles.metricValue}>{workspace?.governance_ready ? 'ready' : 'pending'}</span>
          </div>
        ) : null}
      </div>

      {visibility.certificationStatus ? (
        <p
          className={styles.levelSummary}
          data-testid="executive-workspace-level"
          data-workspace-ready={workspaceReady ? 'true' : 'false'}
        >
          Workspace Level: {workspaceLevel || 'incomplete'}
        </p>
      ) : null}
    </header>
  );
}

export default ExecutiveWorkspaceIndicators;
