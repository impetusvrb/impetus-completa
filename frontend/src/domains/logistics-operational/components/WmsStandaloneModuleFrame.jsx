import React from 'react';
import { canAccessWmsModule } from '../config/wmsRbacNavigation.js';
import { classifyWmsError } from '../utils/wmsErrorClassifier.js';
import { WmsModulePermissionDenied } from './WmsModuleStates.jsx';
import { IndustrialOperationalModule } from '../../../presentation/industrial-module/index.js';

/**
 * WMS-007A — Adapter fino para módulos standalone.
 * OPM-001A — Delega layout/estados ao Industrial Operational Module Standard.
 * screen-header preservado via IndustrialModuleHeader.
 */
export default function WmsStandaloneModuleFrame({
  moduleId,
  title,
  description,
  columns,
  rows,
  loading,
  error,
  reload,
  phase = 'WMS-007A'
}) {
  if (!canAccessWmsModule(moduleId)) {
    return <WmsModulePermissionDenied moduleId={moduleId} />;
  }

  const errorType = error ? classifyWmsError(error) : null;

  return (
    <div data-wms-module={moduleId} data-wms-standalone="true" data-wms-phase={phase}>
      <IndustrialOperationalModule
        moduleId={moduleId}
        domain="wms"
        title={title}
        description={description}
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        errorType={errorType}
        reload={reload}
        phase={phase}
      />
    </div>
  );
}
