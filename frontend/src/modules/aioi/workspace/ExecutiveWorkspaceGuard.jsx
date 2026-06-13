/**
 * AIOI-P6.4 — Executive Workspace Guard (UI EXPERIENCE ONLY · READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveWorkspace.module.css';

function ExecutiveWorkspaceFallback({ health }) {
  return (
    <div
      className={styles.fallbackPanel}
      role="alert"
      aria-live="assertive"
      data-testid="executive-workspace-fallback"
      aria-label="Executive Workspace Fallback"
    >
      <p className={styles.fallbackEyebrow}>AIOI-P6.4 · WORKSPACE</p>
      <h1 className={styles.fallbackTitle}>Workspace Executivo Indisponível</h1>
      <p className={styles.fallbackMessage}>
        O workspace institucional não atingiu o nível de prontidão enterprise certificado.
      </p>
      <p className={styles.fallbackMeta} data-testid="executive-workspace-fallback-level">
        Nível: {health?.workspace_level || 'incomplete'} · Módulos: {health?.modules_ready ?? 0}/
        {health?.modules_total ?? 0}
      </p>
    </div>
  );
}

/**
 * @param {{
 *   workspaceReady?: boolean,
 *   health?: object,
 *   children?: React.ReactNode
 * }} props
 */
export function ExecutiveWorkspaceGuard({ workspaceReady, health, children }) {
  if (workspaceReady === false) {
    return <ExecutiveWorkspaceFallback health={health} />;
  }

  return (
    <div
      data-testid="executive-workspace-guard"
      aria-label="Executive Workspace Guard Granted"
      className={styles.guardShell}
    >
      {children}
    </div>
  );
}

export default ExecutiveWorkspaceGuard;
