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
import ReceivingDetailsPanel from './ReceivingDetailsPanel.jsx';
import ReceivingOperationalIntelligencePanel from './ReceivingOperationalIntelligencePanel.jsx';
import ReceivingDockPanel from './ReceivingDockPanel.jsx';
import ReceivingAsnPanel from './ReceivingAsnPanel.jsx';
import { RECEIVING_ASN_STATUSES } from './receivingListUtils.js';
import { RECEIVING_GRID_COLUMNS } from './receivingColumns.jsx';
import { exportReceivingCsv, exportReceivingExcel, exportReceivingPdf } from './receivingExport.js';
import { toReceivingOperationalMessage, sanitizeOperationalDetail } from './receivingOperationalMessages.js';
import { trackReceivingExport, trackReceivingTimeline } from './receivingObservability.js';
import { MODULE_ID, PHASE } from './useReceivingFoundation.js';
import './receiving-module.css';

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
 * OPM-003 — Receiving Operations & Inbound Logistics.
 * Porta de entrada operacional do WMS · componentes WMS-REF-001.
 */
export default function ReceivingOperationalModule({
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
  timelinePeriodDays,
  setTimelinePeriodDays,
  timelineOperatorFilter,
  setTimelineOperatorFilter,
  timelineDockFilter,
  setTimelineDockFilter,
  timelineSupplierFilter,
  setTimelineSupplierFilter,
  timelineDockOptions = [],
  timelineSupplierOptions = [],
  timelineEvents = [],
  dockPanelRows = [],
  intelligence,
  loadMeta,
  completeReceiving,
  completingId,
  createAsn,
  warehouses = [],
  docks = []
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
    if (uiState === MODULE_STATES.empty) return toReceivingOperationalMessage('empty');
    if (kpiPartial) return toReceivingOperationalMessage('partial');
    return sanitizeOperationalDetail(error) ?? toReceivingOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType, kpiPartial]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · inbound · ${PHASE}`;
    return `${base} · inbound · ${PHASE}`;
  }, [uiState, loadMeta]);

  const filterButtons = useMemo(
    () =>
      RECEIVING_ASN_STATUSES.map((f) => ({
        id: f.id,
        label: f.label,
        active: statusFilter === f.id
      })),
    [statusFilter]
  );

  const handleToolbar = (action) => {
    if (action === TOOLBAR_ACTIONS.refresh && reload) {
      logWmsUiEvent({ event: 'RCV_TOOLBAR_REFRESH', module: MODULE_ID, phase: PHASE });
      reload();
    }
  };

  const handleExport = async (format) => {
    if (!rows.length || exportBusy) return;
    setExportBusy(true);
    try {
      if (format === 'csv') exportReceivingCsv(rows);
      if (format === 'excel') await exportReceivingExcel(rows);
      if (format === 'pdf') await exportReceivingPdf(rows);
      trackReceivingExport(format, rows.length);
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
      data-wms-inbound-entry="true"
    >
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel="Operações · WMS · inbound logistics · porta de entrada"
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
          <ReceivingDetailsPanel
            open={!!selectedRow}
            row={selectedRow}
            onClose={() => setSelectedRow(null)}
            onComplete={completeReceiving}
            completing={completingId === selectedRow?._order?.id}
          />
        }
      >
        <InventoryExport onAction={handleEoxAction} disabled={loading || exportBusy} exportEnabled={rows.length > 0} />

        <InventoryDashboard kpis={kpis} columns={4} />

        <ReceivingAsnPanel warehouses={warehouses} docks={docks} onSubmit={createAsn} disabled={loading} />

        <div className="receiving-module-controls">
          <InventorySearch
            value={search}
            onChange={setSearch}
            disabled={loading}
            placeholder="Pesquisar ASN, fornecedor, pedido compra, doca, documento…"
          />
          <InventoryFilters filters={filterButtons} onFilterChange={setStatusFilter} disabled={loading} />
        </div>

        <ReceivingDockPanel docks={dockPanelRows} />

        <InventoryMetrics intelligence={intelligence} Panel={ReceivingOperationalIntelligencePanel} />

        <InventoryTimeline
          periodDays={timelinePeriodDays}
          onPeriodChange={setTimelinePeriodDays}
          onPeriodTrack={(days) => trackReceivingTimeline(days)}
          userFilter={timelineOperatorFilter}
          onUserFilterChange={setTimelineOperatorFilter}
          warehouseFilter={timelineDockFilter}
          onWarehouseFilterChange={setTimelineDockFilter}
          productFilter={timelineSupplierFilter}
          onProductFilterChange={setTimelineSupplierFilter}
          warehouses={timelineDockOptions}
          products={timelineSupplierOptions}
          labels={{
            section: 'Timeline recebimento · filtros',
            user: 'Operador',
            warehouse: 'Doca',
            product: 'Fornecedor',
            userPlaceholder: 'Operador…'
          }}
        />

        {!showGrid && <IndustrialModuleStateView state={uiState} detail={friendlyDetail} moduleLabel={title} />}

        {showGrid && rows.length === 0 && search && (
          <IndustrialModuleStateView
            state={MODULE_STATES.empty}
            detail="Nenhum recebimento corresponde aos filtros aplicados."
            moduleLabel={title}
          />
        )}

        {showGrid && rows.length > 0 && (
          <InventoryGrid
            rows={rows}
            columns={RECEIVING_GRID_COLUMNS}
            onRowSelect={setSelectedRow}
            selectedRowId={selectedRow?.id}
            pageSize={25}
            enableSortTracking={false}
          />
        )}

        {showGrid && rows.length > 0 && allRows.length !== rows.length && (
          <p className="receiving-grid-summary">
            A mostrar {rows.length} de {allRows.length} recebimentos
          </p>
        )}
      </IndustrialModuleLayout>
    </div>
  );
}
