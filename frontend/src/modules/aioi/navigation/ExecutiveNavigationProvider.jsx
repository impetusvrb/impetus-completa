/**
 * AIOI-P6.2 — Executive Navigation Provider (UI EXPERIENCE ONLY · composição P6.1)
 *
 * Composição P6.1 (guard) → children + indicadores institucionais.
 * Proibido consumo directo P5.x view models / APIs.
 */

import React, { useMemo } from 'react';
import { ExecutiveNavigationContext } from './ExecutiveNavigationContext.jsx';
import {
  EXECUTIVE_NAVIGATION_MODULES,
  DEFAULT_EXECUTIVE_NAVIGATION_SECTION,
  isValidExecutiveNavigationSection,
  countReadyExecutiveNavigationModules
} from './ExecutiveNavigationModel.js';
import { buildExecutiveBreadcrumbTrail } from './ExecutiveBreadcrumbService.js';
import ExecutiveNavigationIndicators from './ExecutiveNavigationIndicators.jsx';
import styles from './ExecutiveNavigationExperience.module.css';

function resolveTenantFromStorage() {
  if (typeof window === 'undefined') {
    return { tenantLabel: '—', companyId: null };
  }
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return {
      tenantLabel: user.company_name || user.tenant_label || user.companyName || '—',
      companyId: user.company_id || user.companyId || null
    };
  } catch {
    return { tenantLabel: '—', companyId: null };
  }
}

/**
 * @param {{
 *   children?: React.ReactNode,
 *   activeSection?: string,
 *   tenantLabel?: string,
 *   companyId?: string|null,
 *   governanceLevel?: string
 * }} props
 */
export function ExecutiveNavigationProvider({
  children,
  activeSection,
  tenantLabel,
  companyId,
  governanceLevel
}) {
  const stored = resolveTenantFromStorage();
  const resolvedTenant = tenantLabel ?? stored.tenantLabel;
  const resolvedCompanyId = companyId !== undefined ? companyId : stored.companyId;

  const activeSectionId = isValidExecutiveNavigationSection(activeSection)
    ? activeSection
    : DEFAULT_EXECUTIVE_NAVIGATION_SECTION;

  const breadcrumbs = useMemo(
    () => buildExecutiveBreadcrumbTrail(activeSectionId),
    [activeSectionId]
  );

  const modulesReady = countReadyExecutiveNavigationModules();
  const modulesTotal = EXECUTIVE_NAVIGATION_MODULES.length;

  const contextValue = useMemo(
    () => ({
      activeSectionId,
      breadcrumbs,
      modules: EXECUTIVE_NAVIGATION_MODULES,
      tenantLabel: resolvedTenant,
      companyId: resolvedCompanyId,
      modulesReady,
      modulesTotal,
      governanceLevel: governanceLevel || 'executive_access',
      readOnly: true
    }),
    [activeSectionId, breadcrumbs, resolvedTenant, resolvedCompanyId, modulesReady, modulesTotal, governanceLevel]
  );

  return (
    <ExecutiveNavigationContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-navigation-provider"
        aria-label="Executive Navigation Provider"
      >
        <ExecutiveNavigationIndicators
          breadcrumbs={breadcrumbs}
          modules={EXECUTIVE_NAVIGATION_MODULES}
          activeSectionId={activeSectionId}
          tenantLabel={resolvedTenant}
          companyId={resolvedCompanyId}
          modulesReady={modulesReady}
          modulesTotal={modulesTotal}
        />
        <div className={styles.providerContent} data-testid="executive-navigation-content">
          {children}
        </div>
      </div>
    </ExecutiveNavigationContext.Provider>
  );
}

export default ExecutiveNavigationProvider;
