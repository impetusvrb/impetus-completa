/**
 * AIOI-P6.4 / P6.5 — Executive Workspace Provider (UI EXPERIENCE ONLY · composição P6.3)
 *
 * Disponibiliza workspace via Context API — sem side effects.
 */

import React, { useMemo } from 'react';
import { ExecutiveWorkspaceContext } from './ExecutiveWorkspaceContext.jsx';
import { getExecutiveWorkspaceModel, getExecutiveWorkspaceHealth } from './ExecutiveWorkspaceService.js';
import { useExecutiveWorkspacePreferences } from './ExecutiveWorkspacePreferencesContext.jsx';
import { resolveWorkspacePresentation } from './ExecutiveWorkspacePreferencesService.js';
import ExecutiveWorkspaceIndicators from './ExecutiveWorkspaceIndicators.jsx';
import ExecutiveWorkspaceGuard from './ExecutiveWorkspaceGuard.jsx';
import styles from './ExecutiveWorkspace.module.css';

/**
 * @param {{
 *   children?: React.ReactNode,
 *   workspaceModelGetter?: () => object,
 *   workspaceHealthGetter?: () => object
 * }} props
 */
export function ExecutiveWorkspaceProvider({
  children,
  workspaceModelGetter,
  workspaceHealthGetter
}) {
  const getModel = workspaceModelGetter || getExecutiveWorkspaceModel;
  const getHealth = workspaceHealthGetter || getExecutiveWorkspaceHealth;

  const prefsCtx = useExecutiveWorkspacePreferences();
  const presentation = resolveWorkspacePresentation(prefsCtx?.preferences);

  const workspace = useMemo(() => getModel(), [getModel]);
  const health = useMemo(() => getHealth(), [getHealth]);

  const contextValue = useMemo(
    () => ({
      workspace,
      workspaceReady: health.workspace_ready,
      workspaceLevel: health.workspace_level,
      health,
      readOnly: true
    }),
    [workspace, health]
  );

  return (
    <ExecutiveWorkspaceContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-workspace-provider"
        data-workspace-layout={presentation.layout}
        data-workspace-density={presentation.density}
        data-default-landing={presentation.defaultLanding}
        aria-label="Executive Workspace Provider"
      >
        <ExecutiveWorkspaceIndicators
          workspace={workspace}
          workspaceReady={health.workspace_ready}
          workspaceLevel={health.workspace_level}
        />
        <ExecutiveWorkspaceGuard workspaceReady={health.workspace_ready} health={health}>
          <div className={styles.providerContent} data-testid="executive-workspace-content">
            {children}
          </div>
        </ExecutiveWorkspaceGuard>
      </div>
    </ExecutiveWorkspaceContext.Provider>
  );
}

export default ExecutiveWorkspaceProvider;
