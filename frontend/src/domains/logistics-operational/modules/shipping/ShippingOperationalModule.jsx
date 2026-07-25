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
import ShippingDetailsPanel from './ShippingDetailsPanel.jsx';
import ShippingOperationalIntelligencePanel from './ShippingOperationalIntelligencePanel.jsx';
import ShippingLoadPanel from './ShippingLoadPanel.jsx';
import ShippingLoadingPanel from './ShippingLoadingPanel.jsx';
import { SHIPPING_ORDER_STATUSES } from './shippingListUtils.js';
import { SHIPPING_GRID_COLUMNS } from './shippingColumns.jsx';
import { exportShippingCsv, exportShippingExcel, exportShippingPdf } from './shippingExport.js';
import { toShippingOperationalMessage, sanitizeOperationalDetail } from './shippingOperationalMessages.js';
import { trackShippingExport, trackShippingTimeline } from './shippingObservability.js';
import { MODULE_ID, PHASE } from './useShippingFoundation.js';
import './shipping-module.css';

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
 * OPM-005 — Shipping Control & Outbound Logistics.
 * Conclusão order fulfillment · componentes WMS-REF-001.
 */
export default function ShippingOperationalModule({
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
  loadPanels = [],
  dockPanelRows = [],
  pickingCandidates = [],
  timelinePeriodDays,
  setTimelinePeriodDays,
  timelineOperatorFilter,
  setTimelineOperatorFilter,
  timelineCarrierFilter,
  setTimelineCarrierFilter,
  timelineDockFilter,
  setTimelineDockFilter,
  timelineOrderFilter,
  setTimelineOrderFilter,
  timelineDockOptions = [],
  timelineOrderOptions = [],
  timelineEvents = [],
  intelligence,
  loadMeta,
  startLoading,
  dispatchShipping,
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
    if (uiState === MODULE_STATES.empty) return toShippingOperationalMessage('empty');
    if (kpiPartial) return toShippingOperationalMessage('partial');
    return sanitizeOperationalDetail(error) ?? toShippingOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType, kpiPartial]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · outbound · ${PHASE}`;
    return `${base} · outbound · ${PHASE}`;
  }, [uiState, loadMeta]);

  const filterButtons = useMemo(
    () =>
      SHIPPING_ORDER_STATUSES.map((f) => ({
        id: f.id,
        label: f.label,
        active: statusFilter === f.id
      })),
    [statusFilter]
  );

  const handleToolbar = (action) => {
    if (action === TOOLBAR_ACTIONS.refresh && reload) {
      logWmsUiEvent({ event: 'SHP_TOOLBAR_REFRESH', module: MODULE_ID, phase: PHASE });
      reload();
    }
  };

  const handleExport = async (format) => {
    if (!rows.length || exportBusy) return;
    setExportBusy(true);
    try {
      if (format === 'csv') exportShippingCsv(rows);
      if (format === 'excel') await exportShippingExcel(rows);
      if (format === 'pdf') await exportShippingPdf(rows);
      trackShippingExport(format, rows.length);
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
      data-wms-outbound-logistics="true"
    >
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel="Operações · WMS · outbound logistics · expedição"
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
          <ShippingDetailsPanel
            open={!!selectedRow}
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onStartLoading={startLoading}
            onDispatch={dispatchShipping}
            busy={actionBusyId === selectedRow?._order?.id}
            pickingCandidates={pickingCandidates}
          />
        }
      >
        <InventoryExport onAction={handleEoxAction} disabled={loading || exportBusy} exportEnabled={rows.length > 0} />

        <InventoryDashboard kpis={kpis} columns={4} />

        <div className="shipping-module-controls">
          <InventorySearch
            value={search}
            onChange={setSearch}
            disabled={loading}
            placeholder="Pesquisar ordem, transportadora, carga, veículo, doca…"
          />
          <InventoryFilters filters={filterButtons} onFilterChange={setStatusFilter} disabled={loading} />
        </div>

        <ShippingLoadPanel loads={loadPanels} />

        <ShippingLoadingPanel docks={dockPanelRows} />

        <InventoryMetrics intelligence={intelligence} Panel={ShippingOperationalIntelligencePanel} />

        <InventoryTimeline
          periodDays={timelinePeriodDays}
          onPeriodChange={setTimelinePeriodDays}
          onPeriodTrack={(days) => trackShippingTimeline(days)}
          userFilter={timelineOperatorFilter}
          onUserFilterChange={setTimelineOperatorFilter}
          warehouseFilter={timelineDockFilter}
          onWarehouseFilterChange={setTimelineDockFilter}
          productFilter={timelineOrderFilter}
          onProductFilterChange={setTimelineOrderFilter}
          warehouses={timelineDockOptions}
          products={timelineOrderOptions}
          labels={{
            section: 'Timeline expedição · filtros',
            user: 'Operador',
            warehouse: 'Doca',
            product: 'Ordem',
            userPlaceholder: 'Operador…'
          }}
        />

        <div className="shipping-carrier-filter">
          <span className="shipping-filter-label">Transportadora</span>
          <input
            type="text"
            className="shipping-timeline-input"
            value={timelineCarrierFilter}
            onChange={(e) => setTimelineCarrierFilter(e.target.value)}
            placeholder="Filtrar timeline…"
            aria-label="Filtrar timeline por transportadora"
          />
        </div>

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
            columns={SHIPPING_GRID_COLUMNS}
            onRowSelect={setSelectedRow}
            selectedRowId={selectedRow?.id}
            pageSize={25}
            enableSortTracking={false}
          />
        )}

        {showGrid && rows.length > 0 && allRows.length !== rows.length && (
          <p className="shipping-grid-summary">
            A mostrar {rows.length} de {allRows.length} ordens de expedição
          </p>
        )}
      </IndustrialModuleLayout>
    </div>
  );
}
