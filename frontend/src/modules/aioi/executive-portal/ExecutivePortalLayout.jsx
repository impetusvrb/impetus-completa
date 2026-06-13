/**
 * AIOI-P5.5 — Executive Portal Layout (READ ONLY · shell soberano)
 */

import React from 'react';
import styles from './ExecutivePortal.module.css';
import ExecutivePortalHeader from './ExecutivePortalHeader.jsx';
import ExecutivePortalSidebar from './ExecutivePortalSidebar.jsx';
import ExecutivePortalWorkspace from './ExecutivePortalWorkspace.jsx';

export function ExecutivePortalLayout({
  activeSection,
  onNavigate,
  companyId,
  tenantLabel,
  fetcher
}) {
  return (
    <div className={styles.portal} data-testid="executive-portal-layout">
      <ExecutivePortalHeader tenantLabel={tenantLabel} />
      <div className={styles.layout}>
        <ExecutivePortalSidebar
          activeSection={activeSection}
          onNavigate={onNavigate}
        />
        <ExecutivePortalWorkspace
          activeSection={activeSection}
          companyId={companyId}
          tenantLabel={tenantLabel}
          fetcher={fetcher}
        />
      </div>
    </div>
  );
}

export default ExecutivePortalLayout;
