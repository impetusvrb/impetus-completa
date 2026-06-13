/**
 * AIOI-P5.5 + P5.6 + P5.7 + P5.8 — Executive Portal Workspace
 */

import React from 'react';
import styles from './ExecutivePortal.module.css';
import ExecutiveCockpitPage from '../executive-cockpit/ExecutiveCockpitPage.jsx';
import DecisionVisualizationPage from '../decision-visualization/DecisionVisualizationPage.jsx';
import InterfaceIntelligencePage from '../interface-intelligence/InterfaceIntelligencePage.jsx';
import ExecutiveReportsPage from '../executive-reports/ExecutiveReportsPage.jsx';
import {
  getExecutivePortalSection,
  isExecutivePortalPlaceholder
} from './ExecutivePortalNavigation.js';

function PortalPlaceholder({ section }) {
  return (
    <div
      className={styles.placeholderPanel}
      role="status"
      aria-live="polite"
      data-testid={`portal-placeholder-${section.id}`}
    >
      <p className={styles.placeholderLabel}>Placeholder</p>
      <h2 className={styles.placeholderTitle}>{section.label}</h2>
      <p className={styles.placeholderMessage}>
        Módulo executivo futuro — somente visualização READ ONLY quando disponível.
      </p>
    </div>
  );
}

function PortalEmptyState() {
  return (
    <div
      className={styles.statePanel}
      role="status"
      aria-live="polite"
      data-testid="portal-workspace-empty"
    >
      <p className={styles.stateLabel}>Sem tenant</p>
      <p className={styles.stateMessage}>
        Selecione um tenant para aceder às experiências executivas.
      </p>
    </div>
  );
}

function PortalUnknownSection({ sectionId }) {
  return (
    <div
      className={styles.statePanel}
      role="alert"
      data-testid="portal-workspace-error"
    >
      <p className={styles.stateLabel}>Secção inválida</p>
      <p className={`${styles.stateMessage} ${styles.stateError}`}>
        {sectionId || 'unknown'}
      </p>
    </div>
  );
}

export function ExecutivePortalWorkspace({
  activeSection,
  companyId,
  tenantLabel,
  fetcher
}) {
  const section = getExecutivePortalSection(activeSection);

  if (!section) {
    return <PortalUnknownSection sectionId={activeSection} />;
  }

  if (
    !companyId &&
    (section.id === 'executive_cockpit' ||
      section.id === 'decision_visualization' ||
      section.id === 'interface_intelligence' ||
      section.id === 'executive_reports')
  ) {
    return <PortalEmptyState />;
  }

  if (section.id === 'executive_cockpit') {
    return (
      <div
        className={styles.workspace}
        data-testid="portal-workspace-cockpit"
        aria-label="Executive Cockpit Workspace"
      >
        <ExecutiveCockpitPage companyId={companyId} fetcher={fetcher} />
      </div>
    );
  }

  if (section.id === 'decision_visualization') {
    return (
      <div
        className={styles.workspace}
        data-testid="portal-workspace-decision_visualization"
        aria-label="Decision Visualization Workspace"
      >
        <DecisionVisualizationPage companyId={companyId} fetcher={fetcher} />
      </div>
    );
  }

  if (section.id === 'interface_intelligence') {
    return (
      <div
        className={styles.workspace}
        data-testid="portal-workspace-interface_intelligence"
        aria-label="Interface Intelligence Workspace"
      >
        <InterfaceIntelligencePage companyId={companyId} fetcher={fetcher} />
      </div>
    );
  }

  if (section.id === 'executive_reports') {
    return (
      <div
        className={styles.workspace}
        data-testid="portal-workspace-executive_reports"
        aria-label="Executive Reports Workspace"
      >
        <ExecutiveReportsPage companyId={companyId} fetcher={fetcher} />
      </div>
    );
  }

  if (isExecutivePortalPlaceholder(section.id)) {
    return (
      <div
        className={styles.workspace}
        data-testid={`portal-workspace-${section.id}`}
        aria-label={`${section.label} Workspace`}
      >
        <PortalPlaceholder section={section} />
      </div>
    );
  }

  return <PortalUnknownSection sectionId={activeSection} />;
}

export default ExecutivePortalWorkspace;
