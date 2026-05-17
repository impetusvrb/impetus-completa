import React from 'react';
import { Navigate } from 'react-router-dom';
import { LogisticsOperationalShell } from '../operational-runtime/LogisticsOperationalShell.jsx';
import { isLogisticsOperationalRuntimeEnabled } from '../operational-runtime/logisticsOperationalFeatureFlags.js';
import { LogisticsRuntimePublicationGate } from '../navigation/LogisticsRuntimePublicationGate.jsx';

export default function LogisticsOperationalLayout() {
  if (!isLogisticsOperationalRuntimeEnabled()) {
    return <Navigate to="/app" replace />;
  }
  return (
    <LogisticsRuntimePublicationGate>
      <LogisticsOperationalShell renderOutlet />
    </LogisticsRuntimePublicationGate>
  );
}
