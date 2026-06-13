/**
 * AIOI-P6.3 — Executive Deep Link Guard (UI EXPERIENCE ONLY · READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveDeepLinking.module.css';

function ExecutiveDeepLinkFallback({ deepLink }) {
  return (
    <div
      className={styles.fallbackPanel}
      role="alert"
      aria-live="assertive"
      data-testid="executive-deep-link-fallback"
      aria-label="Executive Deep Link Fallback"
    >
      <p className={styles.fallbackEyebrow}>AIOI-P6.3 · DEEP LINK</p>
      <h1 className={styles.fallbackTitle}>Deep Link Indisponível</h1>
      <p className={styles.fallbackMessage}>
        A rota executiva solicitada não está certificada ou o módulo não está disponível.
      </p>
      <p className={styles.fallbackMeta} data-testid="executive-deep-link-denial-route">
        Rota: {deepLink?.route || 'unknown'}
      </p>
    </div>
  );
}

/**
 * @param {{
 *   deepLink: { ok?: boolean, available?: boolean, route?: string, module?: string|null },
 *   children?: React.ReactNode
 * }} props
 */
export function ExecutiveDeepLinkGuard({ deepLink, children }) {
  if (!deepLink?.ok || !deepLink?.available || !deepLink?.module) {
    return <ExecutiveDeepLinkFallback deepLink={deepLink} />;
  }

  return (
    <div
      data-testid="executive-deep-link-guard"
      aria-label="Executive Deep Link Guard Granted"
      className={styles.guardShell}
      data-deep-link-module={deepLink.module}
      data-deep-link-route={deepLink.route}
    >
      {children}
    </div>
  );
}

export default ExecutiveDeepLinkGuard;
