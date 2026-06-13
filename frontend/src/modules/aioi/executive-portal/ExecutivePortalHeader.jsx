/**
 * AIOI-P5.5 — Executive Portal Header (READ ONLY)
 */

import React from 'react';
import styles from './ExecutivePortal.module.css';

export function ExecutivePortalHeader({ tenantLabel }) {
  const tenant = tenantLabel || '—';

  return (
    <header
      className={styles.header}
      data-testid="executive-portal-header"
      aria-label="Executive Portal Header"
    >
      <div className={styles.headerBrand}>
        <p className={styles.headerEyebrow}>AIOI · P5.5</p>
        <h1 className={styles.headerTitle}>Executive Intelligence Platform</h1>
      </div>
      <div className={styles.headerMeta}>
        <span
          className={styles.readOnlyBadge}
          data-testid="executive-portal-read-only-badge"
        >
          <span className={styles.readOnlyBadgeDot} aria-hidden="true" />
          Read Only
        </span>
        <span
          className={styles.tenantLabel}
          data-testid="executive-portal-tenant"
          aria-label={`Tenant atual: ${tenant}`}
        >
          {tenant}
        </span>
      </div>
    </header>
  );
}

export default ExecutivePortalHeader;
