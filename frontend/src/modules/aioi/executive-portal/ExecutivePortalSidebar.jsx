/**
 * AIOI-P5.5 — Executive Portal Sidebar (navegação local READ ONLY)
 */

import React from 'react';
import styles from './ExecutivePortal.module.css';
import { EXECUTIVE_PORTAL_SECTIONS } from './ExecutivePortalNavigation.js';

export function ExecutivePortalSidebar({ activeSection, onNavigate }) {
  return (
    <nav
      className={styles.sidebar}
      data-testid="executive-portal-sidebar"
      aria-label="Executive Portal Navigation"
    >
      <p className={styles.sidebarTitle}>Modules</p>
      <ul className={styles.navList} role="list">
        {EXECUTIVE_PORTAL_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <li key={section.id} className={styles.navItem}>
              <button
                type="button"
                className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''}`}
                data-testid={`portal-nav-${section.id}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate(section.id)}
              >
                <span>{section.label}</span>
                {section.placeholder && (
                  <span className={styles.navPlaceholderTag}>Soon</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default ExecutivePortalSidebar;
