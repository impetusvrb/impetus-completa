/**
 * Skeleton de loading para widgets — spec v3: nunca spinner genérico.
 * Formato aproximado do widget para melhor UX.
 */
import React from 'react';

export default function WidgetSkeleton({ lines = 3, showKpiGrid = false }) {
  return (
    <div className="dashboard-widget dashboard-widget--skeleton" aria-hidden="true">
      <div className="dashboard-widget__header">
        <div className="dashboard-widget-skeleton__title" />
      </div>
      {showKpiGrid ? (
        <div className="dashboard-widget__kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="dashboard-widget-skeleton__kpi" />
          ))}
        </div>
      ) : (
        <div className="dashboard-widget-skeleton__body">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="dashboard-widget-skeleton__line" />
          ))}
        </div>
      )}
    </div>
  );
}
