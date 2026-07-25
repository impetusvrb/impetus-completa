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
import ClPredictiveInsightsPanel from './ClPredictiveInsightsPanel.jsx';
import ClScenarioSimulationPanel from './ClScenarioSimulationPanel.jsx';
import ClDecisionTracePanel from './ClDecisionTracePanel.jsx';
import ClCognitiveMetricsPanel from './ClCognitiveMetricsPanel.jsx';
import { CL_PRIORITY_FILTERS, CL_MODULE_FILTERS } from './clListUtils.js';
import { CL_RECOMMENDATION_COLUMNS } from './clColumns.jsx';
import { CL_TIMELINE_CATEGORY_FILTERS, CL_SEVERITY_FILTERS } from './clTimelineUtils.js';
import { exportClCsv, exportClExcel, exportClPdf } from './clExport.js';
import { toClOperationalMessage, sanitizeClDetail } from './clOperationalMessages.js';
import { CL_LAYER_PRINCIPLE } from './clCognitiveInvariants.js';
import { MODULE_ID, PHASE } from './useCognitiveLogisticsFoundation.js';
import './cognitive-logistics-module.css';

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
 * OPM-008 — Cognitive Logistics & Decision Intelligence.
 * Camada cognitiva — preditiva, explicável, auditável — sem execução automática.
 */
export default function CognitiveLogisticsModule({
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
  healthScore,
  riskScore,
  search,
  setSearch,
  priorityFilter,
  setPriorityFilter,
  insights,
  decisionTrace,
  scenarios,
  activeScenarioId,
  scenarioResult,
  runScenario,
  timelinePeriodDays,
  setTimelinePeriodDays,
  timelineWarehouseFilter,
  setTimelineWarehouseFilter,
  timelineCategoryFilter,
  setTimelineCategoryFilter,
  timelineSeverityFilter,
  setTimelineSeverityFilter,
  timelineModuleFilter,
  setTimelineModuleFilter,
  timelineWarehouseOptions = [],
  timelineEvents = [],
  selectedRecommendation,
  setSelectedRecommendation,
  selectedInsight,
  setSelectedInsight,
  loadMeta
}) {
  const [exportBusy, setExportBusy] = useState(false);

  if (!canAccessWmsModule(MODULE_ID)) {
    return <WmsModulePermissionDenied moduleId={MODULE_ID} />;
  }

  const errorType = mapErrorType(error, errorTypeProp);
  const uiState = resolveUiState({ loading, error, errorType, rows, kpiPartial });
  const showGrid = uiState === MODULE_STATES.data_loaded || uiState === MODULE_STATES.partial_data || allRows?.length > 0;

  const friendlyDetail = useMemo(() => {
    if (uiState === MODULE_STATES.empty) return toClOperationalMessage('empty');
    if (kpiPartial) return toClOperationalMessage('partial');
    return sanitizeClDetail(error) ?? toClOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType, kpiPartial]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · cognitive · ${PHASE}`;
    return `${base} · decision intelligence · ${PHASE}`;
  }, [uiState, loadMeta]);

  const priorityFilters = useMemo(
    () => CL_PRIORITY_FILTERS.map((f) => ({ ...f, active: priorityFilter === f.id })),
    [priorityFilter]
  );

  const handleExport = async (format) => {
    const data = rows.length ? rows : allRows;
    if (!data.length || exportBusy) return;
    setExportBusy(true);
    try {
      if (format === 'csv') exportClCsv(data);
      if (format === 'excel') await exportClExcel(data);
      if (format === 'pdf') await exportClPdf(data);
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

  const closeTrace = () => {
    setSelectedRecommendation(null);
    setSelectedInsight(null);
  };

  return (
    <div
      data-wms-module={MODULE_ID}
      data-wms-standalone="true"
      data-wms-phase={PHASE}
      data-opm-phase={PHASE}
      data-wms-cognitive-layer="true"
    >
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel={`Cognição · ${CL_LAYER_PRINCIPLE.role} · advisory only`}
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
          decisionTrace ? <ClDecisionTracePanel trace={decisionTrace} onClose={closeTrace} /> : null
        }
      >
        <InventoryExport onAction={handleEoxAction} disabled={loading || exportBusy} exportEnabled={(rows.length || allRows?.length) > 0} />

        <InventoryDashboard kpis={kpis} columns={4} />

        <InventoryMetrics
          intelligence={{ healthScore, riskScore }}
          Panel={ClCognitiveMetricsPanel}
        />

        <ClPredictiveInsightsPanel
          insights={insights}
          selectedInsight={selectedInsight}
          onSelect={setSelectedInsight}
        />

        <ClScenarioSimulationPanel
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          scenarioResult={scenarioResult}
          onRun={runScenario}
          disabled={loading}
        />

        <div className="cl-module-controls">
          <InventorySearch value={search} onChange={setSearch} disabled={loading} placeholder="Pesquisar recomendações cognitivas…" />
          <InventoryFilters filters={priorityFilters} onFilterChange={setPriorityFilter} disabled={loading} />
        </div>

        <InventoryTimeline
          periodDays={timelinePeriodDays}
          onPeriodChange={setTimelinePeriodDays}
          warehouseFilter={timelineWarehouseFilter}
          onWarehouseFilterChange={setTimelineWarehouseFilter}
          productFilter={timelineCategoryFilter}
          onProductFilterChange={setTimelineCategoryFilter}
          userFilter={timelineSeverityFilter}
          onUserFilterChange={setTimelineSeverityFilter}
          warehouses={timelineWarehouseOptions}
          products={CL_TIMELINE_CATEGORY_FILTERS.filter((f) => f.id !== 'all').map((f) => ({ id: f.id, label: f.label }))}
          labels={{
            section: 'Unified cognitive timeline',
            user: 'Severidade',
            warehouse: 'Armazém',
            product: 'Categoria',
            userPlaceholder: 'Severidade…'
          }}
        />

        <div className="cl-timeline-filters">
          <InventoryFilters
            filters={CL_MODULE_FILTERS.map((f) => ({ ...f, active: timelineModuleFilter === f.id }))}
            onFilterChange={setTimelineModuleFilter}
            disabled={loading}
          />
        </div>

        {!showGrid && uiState !== MODULE_STATES.data_loaded && (
          <IndustrialModuleStateView state={uiState} detail={friendlyDetail} moduleLabel={title} />
        )}

        {showGrid && rows.length === 0 && search && (
          <IndustrialModuleStateView state={MODULE_STATES.empty} detail="Nenhuma recomendação corresponde aos filtros." moduleLabel={title} />
        )}

        {(showGrid || allRows?.length > 0) && (
          <>
            <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '16px 0 8px', letterSpacing: 2, textTransform: 'uppercase' }}>
              Recommendation engine (advisory · human decision)
            </h4>
            <InventoryGrid
              rows={rows.length ? rows : allRows}
              columns={CL_RECOMMENDATION_COLUMNS}
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
