import React, { useMemo, useState } from 'react';
import {
  IndustrialModuleLayout,
  IndustrialModuleStateView,
  MODULE_STATES,
  TOOLBAR_ACTIONS
} from '../../../../presentation/industrial-module/index.js';
import { canAccessWmsModule } from '../../config/wmsRbacNavigation.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { WmsModulePermissionDenied } from '../../components/WmsModuleStates.jsx';
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';
import InventoryDetailsPanel from './InventoryDetailsPanel.jsx';
import {
  InventoryDashboard,
  InventoryMetrics,
  InventorySearch,
  InventoryFilters,
  InventoryGrid,
  InventoryTimeline,
  InventoryExport
} from '../../../../presentation/wms-reference-components/index.js';
import { INVENTORY_STATUS_FILTERS } from './inventoryListUtils.js';
import { buildInventoryTimeline } from './inventoryTimelineUtils.js';
import { exportInventoryCsv, exportInventoryExcel, exportInventoryPdf } from './inventoryExport.js';
import { toInventoryOperationalMessage, sanitizeOperationalDetail } from './inventoryOperationalMessages.js';
import { trackInventoryExport, trackInventoryViewChanged } from './inventoryObservability.js';
import { WMS_REFERENCE_MODULE_PHASE } from './wmsReferenceModulePattern.js';
import { MODULE_ID, PHASE } from './useInventoryFoundation.js';
import './inventory-module.css';

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
 * OPM-002A — Reference Module WMS (Inventário).
 * Define o padrão funcional reutilizável para Receiving, Picking, Shipping, Transfers.
 */
export default function InventoryOperationalModule({
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
  movements = [],
  warehouses = [],
  timelinePeriodDays,
  setTimelinePeriodDays,
  timelineUserFilter,
  setTimelineUserFilter,
  timelineWarehouseFilter,
  setTimelineWarehouseFilter,
  timelineProductFilter,
  setTimelineProductFilter,
  timelineProducts = [],
  intelligence,
  loadMeta
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
    if (uiState === MODULE_STATES.empty) return toInventoryOperationalMessage('empty');
    if (kpiPartial) return toInventoryOperationalMessage('partial');
    return sanitizeOperationalDetail(error) ?? toInventoryOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType, kpiPartial]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    const ref = `ref:${WMS_REFERENCE_MODULE_PHASE}`;
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · ${ref}`;
    return `${base} · ${ref}`;
  }, [uiState, loadMeta]);

  const timelineEvents = useMemo(() => {
    return buildInventoryTimeline({
      movements,
      itemId: selectedRow?.item_id || null,
      warehouseId: selectedRow?.warehouse_id || null,
      periodDays: timelinePeriodDays,
      userFilter: timelineUserFilter,
      warehouseFilter: timelineWarehouseFilter,
      productFilter: timelineProductFilter
    });
  }, [
    movements,
    selectedRow,
    timelinePeriodDays,
    timelineUserFilter,
    timelineWarehouseFilter,
    timelineProductFilter
  ]);

  const filterButtons = useMemo(
    () =>
      INVENTORY_STATUS_FILTERS.map((f) => ({
        id: f.id,
        label: f.label,
        active: statusFilter === f.id
      })),
    [statusFilter]
  );

  const handleToolbar = (action) => {
    if (action === TOOLBAR_ACTIONS.refresh && reload) {
      logWmsUiEvent({ event: 'INV_TOOLBAR_REFRESH', module: MODULE_ID, phase: PHASE });
      reload();
    }
  };

  const handleExport = async (format) => {
    if (!rows.length || exportBusy) return;
    setExportBusy(true);
    try {
      let ok = false;
      if (format === 'csv') ok = exportInventoryCsv(rows);
      if (format === 'excel') ok = await exportInventoryExcel(rows);
      if (format === 'pdf') ok = await exportInventoryPdf(rows);
      trackInventoryExport(format, rows.length);
      logWmsUiEvent({ event: ok ? 'INV_EXPORT_OK' : 'INV_EXPORT_EMPTY', module: MODULE_ID, phase: PHASE, format });
    } finally {
      setExportBusy(false);
    }
  };

  const handleEoxAction = (actionId) => {
    if (actionId === 'refresh') {
      reload?.();
      logWmsUiEvent({ event: 'INV_EOX_REFRESH', module: MODULE_ID, phase: PHASE });
      return;
    }
    if (actionId === 'export_csv') handleExport('csv');
    if (actionId === 'export_excel') handleExport('excel');
    if (actionId === 'export_pdf') handleExport('pdf');
    if (actionId === 'help') trackInventoryViewChanged('help');
  };

  return (
    <div
      data-wms-module={MODULE_ID}
      data-wms-standalone="true"
      data-wms-phase={PHASE}
      data-opm-phase={PHASE}
      data-wms-reference-module="true"
    >
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel="Operações · WMS · inventário · reference module"
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
          <InventoryDetailsPanel open={!!selectedRow} row={selectedRow} onClose={() => setSelectedRow(null)} />
        }
      >
        <InventoryExport
          onAction={handleEoxAction}
          disabled={loading || exportBusy}
          exportEnabled={rows.length > 0}
        />

        <InventoryDashboard kpis={kpis} columns={4} />

        <div className="inventory-module-controls">
          <InventorySearch value={search} onChange={setSearch} disabled={loading} />
          <InventoryFilters filters={filterButtons} onFilterChange={setStatusFilter} disabled={loading} />
        </div>

        <InventoryMetrics intelligence={intelligence} />

        <InventoryTimeline
          periodDays={timelinePeriodDays}
          onPeriodChange={setTimelinePeriodDays}
          userFilter={timelineUserFilter}
          onUserFilterChange={setTimelineUserFilter}
          warehouseFilter={timelineWarehouseFilter}
          onWarehouseFilterChange={setTimelineWarehouseFilter}
          productFilter={timelineProductFilter}
          onProductFilterChange={setTimelineProductFilter}
          warehouses={warehouses}
          products={timelineProducts}
        />

        {!showGrid && <IndustrialModuleStateView state={uiState} detail={friendlyDetail} moduleLabel={title} />}

        {showGrid && rows.length === 0 && search && (
          <IndustrialModuleStateView
            state={MODULE_STATES.empty}
            detail="Nenhum registo corresponde aos filtros aplicados."
            moduleLabel={title}
          />
        )}

        {showGrid && rows.length > 0 && (
          <InventoryGrid rows={rows} onRowSelect={setSelectedRow} selectedRowId={selectedRow?.id} pageSize={25} />
        )}

        {showGrid && rows.length > 0 && allRows.length !== rows.length && (
          <p className="inventory-grid-summary">
            A mostrar {rows.length} de {allRows.length} posições de estoque
          </p>
        )}
      </IndustrialModuleLayout>
    </div>
  );
}
