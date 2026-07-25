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
import PickingDetailsPanel from './PickingDetailsPanel.jsx';
import PickingOperationalIntelligencePanel from './PickingOperationalIntelligencePanel.jsx';
import PickingWavePanel from './PickingWavePanel.jsx';
import PickingRoutePanel from './PickingRoutePanel.jsx';
import { PICKING_ORDER_STATUSES } from './pickingListUtils.js';
import { PICKING_GRID_COLUMNS } from './pickingColumns.jsx';
import { exportPickingCsv, exportPickingExcel, exportPickingPdf } from './pickingExport.js';
import { toPickingOperationalMessage, sanitizeOperationalDetail } from './pickingOperationalMessages.js';
import { trackPickingExport, trackPickingTimeline } from './pickingObservability.js';
import { viewRoute as openRouteView } from './pickingRouteUtils.js';
import { MODULE_ID, PHASE } from './usePickingFoundation.js';
import './picking-module.css';

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
 * OPM-004 — Picking Operations & Order Fulfillment.
 * 1ª etapa atendimento de pedidos · componentes WMS-REF-001.
 */
export default function PickingOperationalModule({
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
  waves = [],
  activeRoutes = [],
  timelinePeriodDays,
  setTimelinePeriodDays,
  timelineOperatorFilter,
  setTimelineOperatorFilter,
  timelineWaveFilter,
  setTimelineWaveFilter,
  timelineOrderFilter,
  setTimelineOrderFilter,
  timelineWaveOptions = [],
  timelineOrderOptions = [],
  timelineEvents = [],
  intelligence,
  loadMeta,
  startPicking,
  pausePicking,
  completePicking,
  actionBusyId,
  viewRoute: onViewRoute,
  routeViewId
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
    if (uiState === MODULE_STATES.empty) return toPickingOperationalMessage('empty');
    if (kpiPartial) return toPickingOperationalMessage('partial');
    return sanitizeOperationalDetail(error) ?? toPickingOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType, kpiPartial]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · fulfillment · ${PHASE}`;
    return `${base} · fulfillment · ${PHASE}`;
  }, [uiState, loadMeta]);

  const filterButtons = useMemo(
    () =>
      PICKING_ORDER_STATUSES.map((f) => ({
        id: f.id,
        label: f.label,
        active: statusFilter === f.id
      })),
    [statusFilter]
  );

  const handleToolbar = (action) => {
    if (action === TOOLBAR_ACTIONS.refresh && reload) {
      logWmsUiEvent({ event: 'PCK_TOOLBAR_REFRESH', module: MODULE_ID, phase: PHASE });
      reload();
    }
  };

  const handleExport = async (format) => {
    if (!rows.length || exportBusy) return;
    setExportBusy(true);
    try {
      if (format === 'csv') exportPickingCsv(rows);
      if (format === 'excel') await exportPickingExcel(rows);
      if (format === 'pdf') await exportPickingPdf(rows);
      trackPickingExport(format, rows.length);
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

  const handleViewRoute = (orderId) => {
    const row = rows.find((r) => r.id === orderId) || allRows.find((r) => r.id === orderId);
    if (row) {
      setSelectedRow(row);
      openRouteView(row);
    }
    onViewRoute?.(orderId);
  };

  return (
    <div
      data-wms-module={MODULE_ID}
      data-wms-standalone="true"
      data-wms-phase={PHASE}
      data-opm-phase={PHASE}
      data-wms-order-fulfillment="true"
    >
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel="Operações · WMS · order fulfillment · separação"
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
          <PickingDetailsPanel
            open={!!selectedRow}
            row={selectedRow}
            onClose={() => {
              setSelectedRow(null);
            }}
            onStart={startPicking}
            onComplete={completePicking}
            onPause={pausePicking}
            busy={actionBusyId === selectedRow?._order?.id}
            routeViewId={routeViewId}
          />
        }
      >
        <InventoryExport onAction={handleEoxAction} disabled={loading || exportBusy} exportEnabled={rows.length > 0} />

        <InventoryDashboard kpis={kpis} columns={4} />

        <div className="picking-module-controls">
          <InventorySearch
            value={search}
            onChange={setSearch}
            disabled={loading}
            placeholder="Pesquisar ordem, onda, operador, zona, rota…"
          />
          <InventoryFilters filters={filterButtons} onFilterChange={setStatusFilter} disabled={loading} />
        </div>

        <PickingWavePanel waves={waves} />

        <PickingRoutePanel routes={activeRoutes} onViewRoute={handleViewRoute} />

        <InventoryMetrics intelligence={intelligence} Panel={PickingOperationalIntelligencePanel} />

        <InventoryTimeline
          periodDays={timelinePeriodDays}
          onPeriodChange={setTimelinePeriodDays}
          onPeriodTrack={(days) => trackPickingTimeline(days)}
          userFilter={timelineOperatorFilter}
          onUserFilterChange={setTimelineOperatorFilter}
          warehouseFilter={timelineWaveFilter}
          onWarehouseFilterChange={setTimelineWaveFilter}
          productFilter={timelineOrderFilter}
          onProductFilterChange={setTimelineOrderFilter}
          warehouses={timelineWaveOptions.map((w) => ({ id: w.id, code: w.label, name: w.label }))}
          products={timelineOrderOptions}
          labels={{
            section: 'Timeline picking · filtros',
            user: 'Operador',
            warehouse: 'Onda',
            product: 'Ordem',
            userPlaceholder: 'Operador…'
          }}
        />

        {!showGrid && <IndustrialModuleStateView state={uiState} detail={friendlyDetail} moduleLabel={title} />}

        {showGrid && rows.length === 0 && search && (
          <IndustrialModuleStateView
            state={MODULE_STATES.empty}
            detail="Nenhuma ordem corresponde aos filtros aplicados."
            moduleLabel={title}
          />
        )}

        {showGrid && rows.length > 0 && (
          <InventoryGrid
            rows={rows}
            columns={PICKING_GRID_COLUMNS}
            onRowSelect={setSelectedRow}
            selectedRowId={selectedRow?.id}
            pageSize={25}
            enableSortTracking={false}
          />
        )}

        {showGrid && rows.length > 0 && allRows.length !== rows.length && (
          <p className="picking-grid-summary">
            A mostrar {rows.length} de {allRows.length} ordens de picking
          </p>
        )}
      </IndustrialModuleLayout>
    </div>
  );
}
