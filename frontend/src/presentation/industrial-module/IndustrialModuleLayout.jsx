import React from 'react';
import IndustrialModuleHeader from './IndustrialModuleHeader.jsx';
import IndustrialKpiPanel from './IndustrialKpiPanel.jsx';
import IndustrialToolbar from './IndustrialToolbar.jsx';
import IndustrialSearchBar from './IndustrialSearchBar.jsx';
import IndustrialFilterBar from './IndustrialFilterBar.jsx';
import IndustrialTimeline from './IndustrialTimeline.jsx';
import IndustrialAlertPanel from './IndustrialAlertPanel.jsx';
import IndustrialInsightPanel from './IndustrialInsightPanel.jsx';
import IndustrialActionBar from './IndustrialActionBar.jsx';
import { INDUSTRIAL_MODULE_PHASE } from './industrialModuleTokens.js';
import { useOnxNavigation } from '../operational-navigation/OnxNavigationContext.jsx';
import './industrial-module.css';

/**
 * OPM-001A — Layout canónico de módulo operacional industrial.
 * Composição por slots — sem lógica de domínio.
 */
export default function IndustrialModuleLayout({
  moduleId,
  title,
  description,
  contextLabel,
  badge,
  kpis = [],
  kpiColumns = 4,
  toolbarActions,
  toolbarStatus,
  onToolbarAction,
  toolbarDisabled,
  showSearch = true,
  showFilters = true,
  filters = [],
  children,
  detailsPanel = null,
  timelineEvents = [],
  showCognitivePanels = true,
  actionBarActions = [],
  onActionBar,
  phase = INDUSTRIAL_MODULE_PHASE,
  showModuleHeader
}) {
  const onx = useOnxNavigation();
  const renderModuleHeader = showModuleHeader !== false && !onx.suppressModuleHeader;

  return (
    <article
      className="industrial-module-layout impetus-card"
      data-industrial-module={moduleId}
      data-industrial-phase={phase}
      data-onx-header-suppressed={onx.suppressModuleHeader ? 'true' : undefined}
      style={{ padding: '1rem', borderRadius: 4, background: 'var(--bg-panel)' }}
    >
      {renderModuleHeader && (
        <IndustrialModuleHeader
          title={title}
          description={description}
          contextLabel={contextLabel}
          badge={badge}
        />
      )}

      {contextLabel && (
        <p className="industrial-module-context" style={{ display: 'none' }} aria-hidden>
          {contextLabel}
        </p>
      )}

      <IndustrialKpiPanel items={kpis} columns={kpiColumns} />

      <IndustrialToolbar
        enabledActions={toolbarActions}
        onAction={onToolbarAction}
        statusLabel={toolbarStatus}
        disabled={toolbarDisabled}
      />

      {showSearch && <IndustrialSearchBar disabled />}
      {showFilters && <IndustrialFilterBar filters={filters} disabled />}

      <div className="industrial-module-main">{children}</div>

      {detailsPanel}

      <IndustrialTimeline events={timelineEvents} />

      {showCognitivePanels && (
        <>
          <IndustrialAlertPanel />
          <IndustrialInsightPanel />
        </>
      )}

      <IndustrialActionBar actions={actionBarActions} onAction={onActionBar} />
    </article>
  );
}
