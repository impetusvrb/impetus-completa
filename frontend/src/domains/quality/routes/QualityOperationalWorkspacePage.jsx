import React from 'react';
import { useLocation } from 'react-router-dom';
import { QualityOperationalWorkspace } from '../operational-runtime/QualityOperationalWorkspace.jsx';

/**
 * Força remount quando ?view= muda (mesmo pathname) — evita workspace preso em fallback.
 */
export default function QualityOperationalWorkspacePage() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search || ''}`;
  return <QualityOperationalWorkspace key={routeKey} />;
}
