/**
 * AIOI-P6.2 — Executive Navigation Indicators (UI EXPERIENCE ONLY · READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveNavigationExperience.module.css';

export function ExecutiveNavigationIndicators({
  breadcrumbs,
  modules,
  activeSectionId,
  tenantLabel,
  companyId,
  modulesReady,
  modulesTotal
}) {
  return (
    <header
      className={styles.indicatorsBar}
      data-testid="executive-navigation-indicators"
      aria-label="Executive Navigation Indicators"
    >
      <div className={styles.indicatorsRow}>
        <p className={styles.indicatorsEyebrow}>AIOI-P6.2 · INSTITUTIONAL NAV</p>
        <nav aria-label="Executive Breadcrumb" data-testid="executive-navigation-breadcrumb">
          <ol className={styles.breadcrumbList}>
            {breadcrumbs.map((crumb, index) => (
              <li
                key={crumb.id}
                className={styles.breadcrumbItem}
                data-testid={`executive-breadcrumb-${crumb.id}`}
                aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {crumb.label}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className={styles.indicatorsMeta} data-testid="executive-navigation-tenant">
        <span className={styles.metaLabel}>Tenant</span>
        <span className={styles.metaValue}>{tenantLabel || '—'}</span>
        {companyId ? (
          <span className={styles.metaMono} data-testid="executive-navigation-company-id">
            {companyId}
          </span>
        ) : null}
      </div>

      <div
        className={styles.moduleMap}
        data-testid="executive-navigation-module-map"
        role="list"
        aria-label="Executive Module Map"
      >
        {modules.map((mod) => {
          const isActive = mod.id === activeSectionId;
          return (
            <div
              key={mod.id}
              className={`${styles.moduleChip} ${isActive ? styles.moduleChipActive : ''}`}
              data-testid={`executive-nav-module-${mod.id}`}
              data-ready={mod.ready ? 'true' : 'false'}
              role="listitem"
              aria-current={isActive ? 'true' : undefined}
            >
              <span className={styles.moduleLabel}>{mod.label}</span>
              <span
                className={`${styles.readinessDot} ${mod.ready ? styles.readinessReady : styles.readinessPending}`}
                data-testid={`executive-nav-readiness-${mod.id}`}
                aria-label={mod.ready ? 'ready' : 'pending'}
              />
            </div>
          );
        })}
      </div>

      <p className={styles.readinessSummary} data-testid="executive-navigation-readiness-summary">
        Modules ready: {modulesReady}/{modulesTotal}
      </p>
    </header>
  );
}

export default ExecutiveNavigationIndicators;
