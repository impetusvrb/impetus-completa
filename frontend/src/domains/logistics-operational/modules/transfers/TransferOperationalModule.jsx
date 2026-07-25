import React, { useMemo, useState } from 'react';
import {
  IndustrialModuleLayout,
  IndustrialModuleStateView,
  MODULE_STATES,
  TOOLBAR_ACTIONS
} from '../../../../presentation/industrial-module/index.js';
import {
  InventoryDashboard,
  InventoryMetrics,
  InventorySearch,
  InventoryFilters,
  InventoryGrid,
  InventoryTimeline,
  InventoryExport
} from '../../../../presentation/wms-reference-components/index.js';
import { canAccessWmsModule } from '../../config/wmsRbacNavigation.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { WmsModulePermissionDenied } from '../../components/WmsModuleStates.jsx';
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';
import TransferDetailsPanel from './TransferDetailsPanel.jsx';
import TransferRoutePanel from './TransferRoutePanel.jsx';
import TransferTypePanel from './TransferTypePanel.jsx';
import TransferOperationalIntelligencePanel from './TransferOperationalIntelligencePanel.jsx';
import { TRANSFER_ORDER_STATUSES, TRANSFER_TYPE_FILTERS } from './transferListUtils.js';
import { TRANSFER_GRID_COLUMNS } from './transferColumns.jsx';
import { exportTransferCsv, exportTransferExcel, exportTransferPdf } from './transferExport.js';
import { toTransferOperationalMessage, sanitizeOperationalDetail } from './transferOperationalMessages.js';
import { trackTransferTimeline } from './transferObservability.js';
import { TRANSFER_LAYER_PRINCIPLE } from './transferIntegrationContracts.js';
import { MODULE_ID, PHASE } from './useTransferFoundation.js';
import './transfer-module.css';

function mapErrorType(error, errorType) {
  if (errorType) return errorType;
  if (error === 'timeout') return 'timeout';
  if (error) return classifyWmsError({ message: error });
  return null;
}

function resolveUiState({ loading, error, errorType, rows, kpiPartial }) {
  if (loading) return MODULE_STATES.loading;
  if (errorType === 'permission_denied') return MODULE_STATES.permission_denied;
  if (errorType === 'api_unavailable' || errorType === 'integration_unavailable') return MODULE_STATES.integration_unavailable;
  if (errorType === 'timeout') return MODULE_STATES.error;
  if (error) return MODULE_STATES.error;
  if (kpiPartial && rows?.length) return MODULE_STATES.partial_data;
  if (!rows?.length) return MODULE_STATES.empty;
  return MODULE_STATES.data_loaded;
}

/**
 * OPM-006 — Transfer Management & Internal Logistics.
 * Camada transversal — conecta fluxos certificados sem alterar posse de estoque.
 */
export default function TransferOperationalModule({
  title,
  description,
  rows,
  allRows,
  loading,
  error,
  errorType: errorTypeProp,
  reload,
  kpis,
  kpiPartial,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  typePanels = [],
  routePanelRows = [],
  timelinePeriodDays,
  setTimelinePeriodDays,
  timelineOperatorFilter,
  setTimelineOperatorFilter,
  timelineWarehouseFilter,
  setTimelineWarehouseFilter,
  timelineTypeFilter,
  setTimelineTypeFilter,
  timelineWarehouseOptions = [],
  timelineEvents = [],
  intelligence,
  loadMeta,
  startExecution,
  completeTransfer,
  actionBusyId
}) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);

  if (!canAccessWmsModule(MODULE_ID)) {
    return <WmsModulePermissionDenied moduleId={MODULE_ID} />;
  }

  const errorType = mapErrorType(error, errorTypeProp);
  const uiState = resolveUiState({ loading, error, errorType, rows, kpiPartial });
  const showGrid =
    uiState === MODULE_STATES.data_loaded ||
    uiState === MODULE_STATES.partial_data ||
    uiState === MODULE_STATES.read_only;

  const friendlyDetail = useMemo(() => {
    if (uiState === MODULE_STATES.empty) return toTransferOperationalMessage('empty');
    if (kpiPartial) return toTransferOperationalMessage('partial');
    return sanitizeOperationalDetail(error) ?? toTransferOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType, kpiPartial]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · internal · ${PHASE}`;
    return `${base} · internal logistics · ${PHASE}`;
  }, [uiState, loadMeta]);

  const statusFilters = useMemo(
    () =>
      TRANSFER_ORDER_STATUSES.map((f) => ({
        id: f.id,
        label: f.label,
        active: statusFilter === f.id
      })),
    [statusFilter]
  );

  const typeFilters = useMemo(
    () =>
      TRANSFER_TYPE_FILTERS.map((f) => ({
        id: f.id,
        label: f.label,
        active: typeFilter === f.id
      })),
    [typeFilter]
  );

  const handleToolbar = (action) => {
    if (action === TOOLBAR_ACTIONS.refresh && reload) {
      logWmsUiEvent({ event: 'XFR_TOOLBAR_REFRESH', module: MODULE_ID, phase: PHASE });
      reload();
    }
  };

  const handleExport = async (format) => {
    if (!rows.length || exportBusy) return;
    setExportBusy(true);
    try {
      if (format === 'csv') exportTransferCsv(rows);
      if (format === 'excel') await exportTransferExcel(rows);
      if (format === 'pdf') await exportTransferPdf(rows);
    } finally {
      setExportBusy(false);
    }
  };

  const handleEoxAction = (actionId) => {
    if (actionId === 'refresh') reload?.();
    if (actionId === 'export_csv') handleExport('csv');
    if (actionId === 'export_excel') handleExport('excel');
    if (actionId === 'export_pdf') handleExport('pdf');
  };

  return (
    <div
      data-wms-module={MODULE_ID}
      data-wms-standalone="true"
      data-wms-phase={PHASE}
      data-opm-phase={PHASE}
      data-wms-internal-logistics="true"
      data-wms-transversal-layer="true"
    >
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel={`Operações · WMS · ${TRANSFER_LAYER_PRINCIPLE.role} · logística interna`}
        badge={PHASE}
        kpis={[]}
        toolbarActions={[TOOLBAR_ACTIONS.refresh, TOOLBAR_ACTIONS.export, TOOLBAR_ACTIONS.help]}
        toolbarStatus={statusLabel}
        onToolbarAction={handleToolbar}
        toolbarDisabled={loading}
        showSearch={false}
        showFilters={false}
        showCognitivePanels={false}
        actionBarActions={[]}
        phase={PHASE}
        timelineEvents={timelineEvents}
        detailsPanel={
          <TransferDetailsPanel
            open={!!selectedRow}
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onStartExecution={startExecution}
            onComplete={completeTransfer}
            busy={actionBusyId === selectedRow?._order?.id}
          />
        }
      >
        <InventoryExport onAction={handleEoxAction} disabled={loading || exportBusy} exportEnabled={rows.length > 0} />

        <InventoryDashboard kpis={kpis} columns={5} />

        <div className="transfer-module-controls">
          <InventorySearch
            value={search}
            onChange={setSearch}
            disabled={loading}
            placeholder="Pesquisar ordem, armazém, zona, bin, operador…"
          />
          <InventoryFilters filters={statusFilters} onFilterChange={setStatusFilter} disabled={loading} />
          <InventoryFilters filters={typeFilters} onFilterChange={setTypeFilter} disabled={loading} />
        </div>

        <TransferTypePanel typePanels={typePanels} />

        <TransferRoutePanel rows={routePanelRows} />

        <InventoryMetrics intelligence={intelligence} Panel={TransferOperationalIntelligencePanel} />

        <InventoryTimeline
          periodDays={timelinePeriodDays}
          onPeriodChange={setTimelinePeriodDays}
          onPeriodTrack={(days) => trackTransferTimeline(days)}
          userFilter={timelineOperatorFilter}
          onUserFilterChange={setTimelineOperatorFilter}
          warehouseFilter={timelineWarehouseFilter}
          onWarehouseFilterChange={setTimelineWarehouseFilter}
          productFilter={timelineTypeFilter}
          onProductFilterChange={setTimelineTypeFilter}
          warehouses={timelineWarehouseOptions}
          products={TRANSFER_TYPE_FILTERS.filter((f) => f.id !== 'all').map((f) => ({ id: f.id, label: f.label }))}
          labels={{
            section: 'Timeline logística interna · filtros',
            user: 'Operador',
            warehouse: 'Armazém',
            product: 'Tipo mov.',
            userPlaceholder: 'Operador…'
          }}
        />

        {!showGrid && <IndustrialModuleStateView state={uiState} detail={friendlyDetail} moduleLabel={title} />}

        {showGrid && rows.length === 0 && search && (
          <IndustrialModuleStateView
            state={MODULE_STATES.empty}
            detail="Nenhuma transferência corresponde aos filtros aplicados."
            moduleLabel={title}
          />
        )}

        {showGrid && rows.length > 0 && (
          <InventoryGrid
            rows={rows}
            columns={TRANSFER_GRID_COLUMNS}
            onRowSelect={setSelectedRow}
            selectedRowId={selectedRow?.id}
            pageSize={25}
            enableSortTracking={false}
          />
        )}

        {showGrid && rows.length > 0 && allRows.length !== rows.length && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
            A mostrar {rows.length} de {allRows.length} transferências internas
          </p>
        )}
      </IndustrialModuleLayout>
    </div>
  );
}
