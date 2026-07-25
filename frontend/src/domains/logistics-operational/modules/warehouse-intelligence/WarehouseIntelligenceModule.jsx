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
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import WiHeatmapPanel from './WiHeatmapPanel.jsx';
import WiCapacityPanel from './WiCapacityPanel.jsx';
import WiBottleneckPanel from './WiBottleneckPanel.jsx';
import WiFlowAnalyticsPanel from './WiFlowAnalyticsPanel.jsx';
import WiAnalyticsMetricsPanel from './WiAnalyticsMetricsPanel.jsx';
import { WI_PRIORITY_FILTERS, WI_DOMAIN_FILTERS } from './wiListUtils.js';
import { WI_RECOMMENDATION_COLUMNS } from './wiColumns.jsx';
import { exportWiCsv, exportWiExcel, exportWiPdf } from './wiExport.js';
import { toWiOperationalMessage, sanitizeWiDetail } from './wiOperationalMessages.js';
import { WI_LAYER_PRINCIPLE } from './wiAnalyticalInvariants.js';
import { trackWiTimeline } from './wiObservability.js';
import { MODULE_ID, PHASE } from './useWarehouseIntelligenceFoundation.js';
import './warehouse-intelligence-module.css';

function mapErrorType(error, errorType) {
  if (errorType) return errorType;
  if (error === 'timeout') return 'timeout';
  if (error) return classifyWmsError({ message: error });
  return null;
}

function resolveUiState({ loading, error, errorType, rows, kpiPartial }) {
  if (loading) return MODULE_STATES.loading;
  if (errorType === 'permission_denied') return MODULE_STATES.permission_denied;
  if (errorType === 'api_unavailable') return MODULE_STATES.integration_unavailable;
  if (errorType === 'timeout') return MODULE_STATES.error;
  if (error) return MODULE_STATES.error;
  if (kpiPartial && rows?.length) return MODULE_STATES.partial_data;
  if (!rows?.length && !kpiPartial) return MODULE_STATES.empty;
  return MODULE_STATES.data_loaded;
}

/**
 * OPM-007 — Warehouse Intelligence & Operational Optimization.
 * Camada analítica read-only — observa, mede, correlaciona, recomenda.
 */
export default function WarehouseIntelligenceModule({
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
  priorityFilter,
  setPriorityFilter,
  heatmaps,
  capacity,
  bottlenecks,
  flow,
  performance,
  timelinePeriodDays,
  setTimelinePeriodDays,
  timelineWarehouseFilter,
  setTimelineWarehouseFilter,
  timelineDomainFilter,
  setTimelineDomainFilter,
  timelineOperatorFilter,
  setTimelineOperatorFilter,
  timelineWarehouseOptions = [],
  timelineEvents = [],
  selectedRecommendation,
  setSelectedRecommendation,
  onHeatmapView,
  onCapacityAnalyze,
  loadMeta
}) {
  const [exportBusy, setExportBusy] = useState(false);

  if (!canAccessWmsModule(MODULE_ID)) {
    return <WmsModulePermissionDenied moduleId={MODULE_ID} />;
  }

  const errorType = mapErrorType(error, errorTypeProp);
  const uiState = resolveUiState({ loading, error, errorType, rows, kpiPartial });
  const showGrid = uiState === MODULE_STATES.data_loaded || uiState === MODULE_STATES.partial_data;

  const friendlyDetail = useMemo(() => {
    if (uiState === MODULE_STATES.empty) return toWiOperationalMessage('empty');
    if (kpiPartial) return toWiOperationalMessage('partial');
    return sanitizeWiDetail(error) ?? toWiOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType, kpiPartial]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · read-only · ${PHASE}`;
    return `${base} · analytical · ${PHASE}`;
  }, [uiState, loadMeta]);

  const priorityFilters = useMemo(
    () => WI_PRIORITY_FILTERS.map((f) => ({ ...f, active: priorityFilter === f.id })),
    [priorityFilter]
  );

  const handleExport = async (format) => {
    if (!rows.length || exportBusy) return;
    setExportBusy(true);
    try {
      if (format === 'csv') exportWiCsv(rows);
      if (format === 'excel') await exportWiExcel(rows);
      if (format === 'pdf') await exportWiPdf(rows);
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
      data-wms-analytical-layer="true"
    >
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel={`Inteligência · ${WI_LAYER_PRINCIPLE.role} · read-only`}
        badge={PHASE}
        kpis={[]}
        toolbarActions={[TOOLBAR_ACTIONS.refresh, TOOLBAR_ACTIONS.export, TOOLBAR_ACTIONS.help]}
        toolbarStatus={statusLabel}
        onToolbarAction={(a) => a === TOOLBAR_ACTIONS.refresh && reload?.()}
        toolbarDisabled={loading}
        showSearch={false}
        showFilters={false}
        showCognitivePanels={false}
        actionBarActions={[]}
        phase={PHASE}
        timelineEvents={timelineEvents}
        detailsPanel={
          selectedRecommendation?._recommendation ? (
            <aside className="wi-trace-panel impetus-card" role="region" aria-label="Rastreabilidade recomendação">
              <span style={{ ...mono, color: 'var(--cyan)', fontSize: 11 }}>{selectedRecommendation.title}</span>
              <p style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)', margin: '8px 0' }}>{selectedRecommendation.message}</p>
              <pre style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selectedRecommendation._recommendation.trace, null, 2)}
              </pre>
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, borderRadius: 4, fontSize: 11 }} onClick={() => setSelectedRecommendation(null)}>
                Fechar
              </button>
            </aside>
          ) : null
        }
      >
        <InventoryExport onAction={handleEoxAction} disabled={loading || exportBusy} exportEnabled={rows.length > 0} />

        <InventoryDashboard kpis={kpis} columns={5} />

        <WiHeatmapPanel heatmaps={heatmaps} onView={onHeatmapView} />
        <WiCapacityPanel capacity={capacity} onAnalyze={onCapacityAnalyze} />
        <WiBottleneckPanel bottlenecks={bottlenecks} />
        <WiFlowAnalyticsPanel flow={flow} />

        <InventoryMetrics intelligence={performance} Panel={WiAnalyticsMetricsPanel} />

        <div className="warehouse-intelligence-module-controls">
          <InventorySearch value={search} onChange={setSearch} disabled={loading} placeholder="Pesquisar recomendações…" />
          <InventoryFilters filters={priorityFilters} onFilterChange={setPriorityFilter} disabled={loading} />
        </div>

        <InventoryTimeline
          periodDays={timelinePeriodDays}
          onPeriodChange={setTimelinePeriodDays}
          onPeriodTrack={(days) => trackWiTimeline(days)}
          userFilter={timelineOperatorFilter}
          onUserFilterChange={setTimelineOperatorFilter}
          warehouseFilter={timelineWarehouseFilter}
          onWarehouseFilterChange={setTimelineWarehouseFilter}
          productFilter={timelineDomainFilter}
          onProductFilterChange={setTimelineDomainFilter}
          warehouses={timelineWarehouseOptions}
          products={WI_DOMAIN_FILTERS.filter((f) => f.id !== 'all').map((f) => ({ id: f.id, label: f.label }))}
          labels={{
            section: 'Timeline analítica consolidada',
            user: 'Operador',
            warehouse: 'Armazém',
            product: 'Domínio',
            userPlaceholder: 'Operador…'
          }}
        />

        {!showGrid && uiState !== MODULE_STATES.data_loaded && (
          <IndustrialModuleStateView state={uiState} detail={friendlyDetail} moduleLabel={title} />
        )}

        {showGrid && rows.length === 0 && search && (
          <IndustrialModuleStateView state={MODULE_STATES.empty} detail="Nenhuma recomendação corresponde aos filtros." moduleLabel={title} />
        )}

        {(showGrid || rows.length > 0) && (
          <>
            <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '16px 0 8px' }}>Recomendações operacionais (informativas)</h4>
            <InventoryGrid
              rows={rows.length ? rows : allRows}
              columns={WI_RECOMMENDATION_COLUMNS}
              onRowSelect={setSelectedRecommendation}
              selectedRowId={selectedRecommendation?.id}
              pageSize={20}
              enableSortTracking={false}
            />
          </>
        )}
      </IndustrialModuleLayout>
    </div>
  );
}
