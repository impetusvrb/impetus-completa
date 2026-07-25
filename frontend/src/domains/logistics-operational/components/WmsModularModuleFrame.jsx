import React from 'react';
import WmsModulePanel, { WmsDataTable } from './WmsModulePanel.jsx';
import { WmsModuleLoading, WmsModuleEmpty, WmsModuleError, WmsModulePermissionDenied } from './WmsModuleStates.jsx';
import { canAccessWmsModule } from '../config/wmsRbacNavigation.js';
import { classifyWmsError } from '../utils/wmsErrorClassifier.js';

/**
 * WMS-007 — Frame partilhado por módulo independente (sem fallback Dashboard).
 */
export default function WmsModularModuleFrame({
  moduleId,
  title,
  columns,
  rows,
  loading,
  error,
  reload,
  phase = 'WMS-007'
}) {
  if (!canAccessWmsModule(moduleId)) {
    return <WmsModulePermissionDenied moduleId={moduleId} />;
  }

  const errorType = error ? classifyWmsError(error) : null;
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div data-wms-module={moduleId} data-wms-phase={phase}>
      <WmsModulePanel
        title={title}
        subtitle="WMS-003 v1 · módulo independente"
        loading={false}
        error={null}
        count={rows.length}
      >
        {loading && <WmsModuleLoading label={`Sincronizando ${title}`} />}
        {!loading && error && <WmsModuleError errorType={errorType} detail={error} />}
        {!loading && !error && showEmpty && <WmsModuleEmpty moduleLabel={title} />}
        {!loading && !error && rows.length > 0 && <WmsDataTable rows={rows} columns={columns} />}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 12, borderRadius: 4 }}
          onClick={reload}
          disabled={loading}
        >
          Actualizar
        </button>
      </WmsModulePanel>
    </div>
  );
}
