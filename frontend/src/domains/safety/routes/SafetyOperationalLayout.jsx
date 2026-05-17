import React from 'react';
import { Navigate } from 'react-router-dom';
import { SafetyOperationalShell } from '../operational-runtime/SafetyOperationalShell.jsx';
import { isSafetyOperationalRuntimeEnabled } from '../operational-runtime/safetyOperationalFeatureFlags.js';
import { SafetyRuntimePublicationGate } from '../navigation/SafetyRuntimePublicationGate.jsx';

export default function SafetyOperationalLayout() {
  if (!isSafetyOperationalRuntimeEnabled()) {
    return <Navigate to="/app" replace />;
  }
  return (
    <SafetyRuntimePublicationGate>
      <SafetyOperationalShell renderOutlet />
    </SafetyRuntimePublicationGate>
  );
}
