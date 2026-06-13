/**
 * AIOI-P5.5 — Executive Portal Page (READ ONLY · navegação local · sem Router global)
 */

import React, { useState, useCallback } from 'react';
import ExecutivePortalLayout from './ExecutivePortalLayout.jsx';
import {
  DEFAULT_EXECUTIVE_PORTAL_SECTION,
  isValidExecutivePortalSection
} from './ExecutivePortalNavigation.js';

export function ExecutivePortalPage({
  companyId,
  tenantLabel,
  fetcher,
  initialSection = DEFAULT_EXECUTIVE_PORTAL_SECTION
}) {
  const [activeSection, setActiveSection] = useState(() =>
    isValidExecutivePortalSection(initialSection)
      ? initialSection
      : DEFAULT_EXECUTIVE_PORTAL_SECTION
  );

  const handleNavigate = useCallback((sectionId) => {
    if (isValidExecutivePortalSection(sectionId)) {
      setActiveSection(sectionId);
    }
  }, []);

  return (
    <div
      data-testid="executive-portal-page"
      aria-label="Enterprise Executive Portal"
    >
      <ExecutivePortalLayout
        activeSection={activeSection}
        onNavigate={handleNavigate}
        companyId={companyId}
        tenantLabel={tenantLabel}
        fetcher={fetcher}
      />
    </div>
  );
}

export default ExecutivePortalPage;
