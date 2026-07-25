import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import WmsStandaloneGate from '../components/WmsStandaloneGate.jsx';
import WmsOperationalDashboardPage from './WmsOperationalDashboardPage.jsx';
import { WMS_OPERATIONAL_MODULES } from '../routes/wmsModuleRegistry.js';

/**
 * WMS-007A — Rotas legacy do workspace: landing CC + redirects transparentes.
 */
export default function WmsLegacyWorkspaceRoutes() {
  return (
    <WmsStandaloneGate>
      <Routes>
        <Route index element={<WmsOperationalDashboardPage />} />
        {WMS_OPERATIONAL_MODULES.map((m) => (
          <Route
            key={m.id}
            path={m.segment}
            element={<Navigate to={m.standalonePath} replace />}
          />
        ))}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </WmsStandaloneGate>
  );
}
