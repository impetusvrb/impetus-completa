import React, { useMemo, useState } from 'react';
import IndustrialModuleLayout from './IndustrialModuleLayout.jsx';
import IndustrialDataGrid from './IndustrialDataGrid.jsx';
import IndustrialDetailsPanel from './IndustrialDetailsPanel.jsx';
import { IndustrialModuleStateView, MODULE_STATES } from './IndustrialModuleStates.jsx';
import { TOOLBAR_ACTIONS, INDUSTRIAL_MODULE_PHASE } from './industrialModuleTokens.js';

/**
 * OPM-001A — Adaptador de listagem operacional (sem CRUD / sem APIs novas).
 * Consumido por WMS standalone frames via composição.
 */
export default function IndustrialOperationalModule({
  moduleId,
  domain = 'wms',
  title,
  description,
  columns,
  rows,
  loading,
  error,
  errorType,
  reload,
  readOnly = false,
  phase = INDUSTRIAL_MODULE_PHASE
}) {
  const [selectedRow, setSelectedRow] = useState(null);

  const uiState = useMemo(() => {
    if (loading) return MODULE_STATES.loading;
    if (errorType === 'permission_denied') return MODULE_STATES.permission_denied;
    if (errorType === 'api_unavailable') return MODULE_STATES.integration_unavailable;
    if (error) return MODULE_STATES.error;
    if (!rows?.length) return MODULE_STATES.empty;
    if (readOnly) return MODULE_STATES.read_only;
    return MODULE_STATES.data_loaded;
  }, [loading, error, errorType, rows, readOnly]);

  const kpis = useMemo(
    () => [
      { id: 'count', label: 'Registos', value: rows?.length ?? 0, color: 'var(--cyan)' },
      { id: 'state', label: 'Estado', value: uiState.replace(/_/g, ' '), color: 'var(--text-secondary)' },
      { id: 'domain', label: 'Domínio', value: domain.toUpperCase(), color: 'var(--text-tertiary)' },
      { id: 'phase', label: 'Framework', value: phase, color: 'var(--green)' }
    ],
    [rows, uiState, domain, phase]
  );

  const showGrid = uiState === MODULE_STATES.data_loaded || uiState === MODULE_STATES.read_only;

  const handleToolbar = (action) => {
    if (action === TOOLBAR_ACTIONS.refresh && reload) reload();
  };

  return (
    <IndustrialModuleLayout
      moduleId={moduleId}
      title={title}
      description={description}
      contextLabel={`Contexto operacional · ${domain} · ${moduleId}`}
      badge={phase}
      kpis={kpis}
      kpiColumns={4}
      toolbarActions={[
        TOOLBAR_ACTIONS.search,
        TOOLBAR_ACTIONS.refresh,
        TOOLBAR_ACTIONS.export,
        TOOLBAR_ACTIONS.filters,
        TOOLBAR_ACTIONS.columns,
        TOOLBAR_ACTIONS.help
      ]}
      toolbarStatus={uiState.replace(/_/g, ' ')}
      onToolbarAction={handleToolbar}
      toolbarDisabled={loading}
      detailsPanel={
        <IndustrialDetailsPanel
          open={!!selectedRow}
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      }
      actionBarActions={[
        { id: 'primary', label: 'Acção principal', enabled: false },
        { id: 'secondary', label: 'Acção secundária', enabled: false }
      ]}
      phase={phase}
    >
      {!showGrid && (
        <IndustrialModuleStateView
          state={uiState}
          detail={error}
          moduleLabel={title}
        />
      )}
      {showGrid && (
        <IndustrialDataGrid
          rows={rows}
          columns={columns}
          onRowSelect={setSelectedRow}
          selectedRowId={selectedRow?.id}
        />
      )}
    </IndustrialModuleLayout>
  );
}
