/**
 * AIOI-P6.1 — Executive Access Guard (SECURITY ONLY · composição P6.0)
 *
 * ExecutivePortalRoute (P6.0) → children quando access_granted.
 * Proibido consumo directo P5.x / P4.x.
 */

import React from 'react';
import { evaluateExecutiveAccessGovernance } from './ExecutiveAccessGovernanceService.js';
import { EXECUTIVE_ACCESS_LEVELS } from './ExecutiveAccessPolicy.js';
import styles from './ExecutiveAccessGuard.module.css';

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { user: {}, authToken: null };
  }
  try {
    const authToken = localStorage.getItem('impetus_token');
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return { user, authToken };
  } catch {
    return { user: {}, authToken: null };
  }
}

function ExecutiveAccessFallback({ denialReason, governanceLevel }) {
  const levelClass =
    governanceLevel === EXECUTIVE_ACCESS_LEVELS.RESTRICTED
      ? styles.fallbackRestricted
      : styles.fallbackBlocked;

  return (
    <div
      className={`${styles.fallbackPanel} ${levelClass}`}
      role="alert"
      aria-live="assertive"
      data-testid="executive-access-guard-fallback"
      aria-label="Executive Access Governance Fallback"
    >
      <p className={styles.fallbackEyebrow}>AIOI-P6.1 · GOVERNED ACCESS</p>
      <h1 className={styles.fallbackTitle}>Acesso Executivo Restrito</h1>
      <p className={styles.fallbackMessage}>
        O Portal Executivo requer elegibilidade institucional certificada.
      </p>
      <p className={styles.fallbackMeta} data-testid="executive-access-denial-reason">
        Nível: {governanceLevel || EXECUTIVE_ACCESS_LEVELS.BLOCKED} · Motivo: {denialReason || 'unknown'}
      </p>
    </div>
  );
}

/**
 * @param {{
 *   children?: React.ReactNode,
 *   user?: object,
 *   authToken?: string|null,
 *   portalReadyChecker?: () => boolean,
 *   governanceEvaluator?: (ctx: object) => object
 * }} props
 */
export function ExecutiveAccessGuard({
  children,
  user,
  authToken,
  portalReadyChecker,
  governanceEvaluator
}) {
  const stored = readStoredAuth();
  const resolvedUser = user ?? stored.user;
  const resolvedToken = authToken !== undefined ? authToken : stored.authToken;

  const evaluator = governanceEvaluator || evaluateExecutiveAccessGovernance;
  const governance = evaluator({
    user: resolvedUser,
    authToken: resolvedToken,
    portalReadyChecker
  });

  if (!governance.access_granted) {
    return (
      <ExecutiveAccessFallback
        denialReason={governance.denial_reason}
        governanceLevel={governance.governance_level}
      />
    );
  }

  return (
    <div
      data-testid="executive-access-guard"
      aria-label="Executive Access Guard Granted"
      className={styles.guardShell}
      data-governance-level={governance.governance_level}
    >
      {children}
    </div>
  );
}

export default ExecutiveAccessGuard;
