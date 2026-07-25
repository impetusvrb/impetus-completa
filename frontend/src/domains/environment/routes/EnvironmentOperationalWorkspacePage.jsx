import React from 'react';
import { useLocation } from 'react-router-dom';
import { EnvironmentOperationalWorkspace } from '../operational-runtime/EnvironmentOperationalWorkspace.jsx';

/** Força remount quando ?view= muda — alinhado com Quality/Safety. */
export default function EnvironmentOperationalWorkspacePage() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search || ''}`;
  return <EnvironmentOperationalWorkspace key={routeKey} />;
}
