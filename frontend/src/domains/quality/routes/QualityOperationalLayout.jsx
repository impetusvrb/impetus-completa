import React from 'react';
import { Navigate } from 'react-router-dom';
import { QualityOperationalShell } from '../operational-runtime/QualityOperationalShell.jsx';
import { isQualityOperationalRuntimeEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';

/**
 * Layout enterprise WAVE 6 — Outlet para rotas filhas lazy (rollback: flag OFF → redirect).
 */
export default function QualityOperationalLayout() {
  if (!isQualityOperationalRuntimeEnabled()) {
    return <Navigate to="/app" replace />;
  }
  return <QualityOperationalShell renderOutlet />;
}
