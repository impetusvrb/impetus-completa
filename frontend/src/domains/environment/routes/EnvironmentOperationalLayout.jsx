import React from 'react';
import { Navigate } from 'react-router-dom';
import { EnvironmentOperationalShell } from '../operational-runtime/EnvironmentOperationalShell.jsx';
import { isEnvironmentOperationalRuntimeEnabled } from '../operational-runtime/environmentOperationalFeatureFlags.js';
import { EnvironmentRuntimePublicationGate } from '../navigation/EnvironmentRuntimePublicationGate.jsx';

export default function EnvironmentOperationalLayout() {
  if (!isEnvironmentOperationalRuntimeEnabled()) {
    return <Navigate to="/app" replace />;
  }
  return (
    <EnvironmentRuntimePublicationGate>
      <EnvironmentOperationalShell renderOutlet />
    </EnvironmentRuntimePublicationGate>
  );
}
