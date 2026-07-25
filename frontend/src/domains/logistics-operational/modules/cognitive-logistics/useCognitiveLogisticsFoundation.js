import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computeWiDashboardKpis } from '../warehouse-intelligence/wiKpiUtils.js';
import { computeWiHeatmaps } from '../warehouse-intelligence/wiHeatmapUtils.js';
import { computeWiCapacityAnalytics } from '../warehouse-intelligence/wiCapacityUtils.js';
import { computeWiBottlenecks } from '../warehouse-intelligence/wiBottleneckUtils.js';
import { computeWiFlowAnalytics } from '../warehouse-intelligence/wiFlowAnalyticsUtils.js';
import { computeWiRecommendations } from '../warehouse-intelligence/wiRecommendationUtils.js';
import { computeClDashboardKpis } from './clKpiUtils.js';
import { computePredictiveInsights } from './clPredictiveUtils.js';
import { computeCognitiveRecommendations, buildCognitiveRecommendationRows } from './clRecommendationEngine.js';
import { buildDecisionTrace, buildInsightTrace } from './clDecisionTrace.js';
import { runScenarioSimulation, CL_SCENARIO_CATALOG } from './clScenarioUtils.js';
import { buildClUnifiedTimeline, buildClTimelineDisplay } from './clTimelineUtils.js';
import { filterClRecommendationRows } from './clListUtils.js';
import {
  trackClLoaded,
  trackClSearch,
  trackClFilter,
  trackClInsightGenerated,
  trackClRecommendationOpened,
  trackClScenarioExecuted,
  trackClTraceViewed
} from './clObservability.js';

const MODULE_ID = 'cognitive_logistics';
const PHASE = 'OPM-008';
const LOAD_TIMEOUT_MS = 45000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function loadCapacities(warehouses) {
  const caps = [];
  for (const w of warehouses.slice(0, 10)) {
    try {
      const res = await wmsV1Api.warehouseCapacity(w.id);
      const data = res?.data || res;
      caps.push({ warehouse_id: w.id, ...data });
    } catch {
      /* optional */
    }
  }
  return caps;
}

/** Read-only — consolida OPM-007 pipeline + camada cognitiva. */
export function useCognitiveLogisticsFoundation() {
  const [snapshot, setSnapshot] = useState({
    warehouses: [],
    balances: [],
    movements: [],
    receiving: [],
    picking: [],
    shipping: [],
    transfers: [],
    capacities: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [loadMeta, setLoadMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timelinePeriodDays, setTimelinePeriodDays] = useState(30);
  const [timelineWarehouseFilter, setTimelineWarehouseFilter] = useState('');
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState('all');
  const [timelineSeverityFilter, setTimelineSeverityFilter] = useState('all');
  const [timelineModuleFilter, setTimelineModuleFilter] = useState('all');
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [scenarioResult, setScenarioResult] = useState(null);

  const load = useCallback(async () => {
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const [whRes, balRes, movRes, rcvRes, pckRes, shpRes, xfrRes] = await withTimeout(
        Promise.all([
          wmsV1Api.listWarehouses(),
          wmsV1Api.listBalances().catch(() => ({ data: [] })),
          wmsV1Api.listMovements().catch(() => ({ data: [] })),
          wmsV1Api.listReceiving().catch(() => ({ data: [] })),
          wmsV1Api.listPicking().catch(() => ({ data: [] })),
          wmsV1Api.listShipping().catch(() => ({ data: [] })),
          wmsV1Api.listTransfers().catch(() => ({ data: [] }))
        ]),
        LOAD_TIMEOUT_MS
      );

      const whRows = extractRows(whRes);
      const capRows = await loadCapacities(whRows);
      const snap = {
        warehouses: whRows,
        balances: extractRows(balRes),
        movements: extractRows(movRes),
        receiving: extractRows(rcvRes),
        picking: extractRows(pckRes),
        shipping: extractRows(shpRes),
        transfers: extractRows(xfrRes),
        capacities: capRows
      };
      setSnapshot(snap);

      const meta = {
        duration_ms: Date.now() - t0,
        loaded_at: new Date().toISOString(),
        sources: 8,
        read_only: true,
        consumes: ['OPM-007', 'WMS-003', 'OPM-GOV-001']
      };
      setLoadMeta(meta);
      trackClLoaded(meta);
    } catch (e) {
      const isTimeout = String(e.message).includes('timeout');
      const type = isTimeout ? 'timeout' : classifyWmsError(e);
      setError(isTimeout ? 'timeout' : e.message);
      setErrorType(type);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const wiAnalytics = useMemo(() => {
    const heatmaps = computeWiHeatmaps(snapshot);
    const capacity = computeWiCapacityAnalytics(snapshot);
    const bottlenecks = computeWiBottlenecks(snapshot);
    const flow = computeWiFlowAnalytics(snapshot);
    const wiKpiBundle = computeWiDashboardKpis(snapshot);
    const wiRecommendations = computeWiRecommendations({
      heatmaps,
      capacity,
      bottlenecks,
      flow,
      transfers: snapshot.transfers
    });
    return { heatmaps, capacity, bottlenecks, flow, wiKpis: wiKpiBundle.items, wiRecommendations, receiving: snapshot.receiving, picking: snapshot.picking };
  }, [snapshot]);

  const kpiBundle = useMemo(
    () => computeClDashboardKpis({ ...wiAnalytics, snapshot }),
    [wiAnalytics, snapshot]
  );

  const insights = useMemo(
    () => computePredictiveInsights({ ...wiAnalytics, snapshot }),
    [wiAnalytics, snapshot]
  );

  useEffect(() => {
    if (insights.length) {
      for (const i of insights.slice(0, 5)) trackClInsightGenerated(i.ruleId);
    }
  }, [insights]);

  const recommendations = useMemo(
    () =>
      computeCognitiveRecommendations({
        wiRecommendations: wiAnalytics.wiRecommendations,
        insights,
        capacity: wiAnalytics.capacity,
        heatmaps: wiAnalytics.heatmaps,
        bottlenecks: wiAnalytics.bottlenecks,
        flow: wiAnalytics.flow,
        transfers: snapshot.transfers
      }),
    [wiAnalytics, insights, snapshot.transfers]
  );

  const recommendationRows = useMemo(() => buildCognitiveRecommendationRows(recommendations), [recommendations]);
  const filteredRows = useMemo(
    () => filterClRecommendationRows(recommendationRows, { search, priorityFilter }),
    [recommendationRows, search, priorityFilter]
  );

  const timelineSource = useMemo(
    () => buildClUnifiedTimeline({ snapshot, insights, recommendations: wiAnalytics.wiRecommendations.concat(recommendations) }),
    [snapshot, insights, recommendations, wiAnalytics.wiRecommendations]
  );

  const timelineEvents = useMemo(
    () =>
      buildClTimelineDisplay({
        events: timelineSource,
        periodDays: timelinePeriodDays,
        warehouseFilter: timelineWarehouseFilter,
        categoryFilter: timelineCategoryFilter,
        severityFilter: timelineSeverityFilter,
        moduleFilter: timelineModuleFilter,
        limit: 40
      }),
    [timelineSource, timelinePeriodDays, timelineWarehouseFilter, timelineCategoryFilter, timelineSeverityFilter, timelineModuleFilter]
  );

  const decisionTrace = useMemo(() => {
    if (selectedRecommendation?._recommendation) {
      return buildDecisionTrace({
        recommendation: selectedRecommendation,
        snapshot,
        wiAnalytics: { ...wiAnalytics, healthScore: kpiBundle.healthScore, riskScore: kpiBundle.riskScore }
      });
    }
    if (selectedInsight) return buildInsightTrace(selectedInsight);
    return null;
  }, [selectedRecommendation, selectedInsight, snapshot, wiAnalytics, kpiBundle]);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (value.trim()) trackClSearch(value.trim().length);
  }, []);

  const handlePriorityFilter = useCallback((id) => {
    setPriorityFilter(id);
    trackClFilter(id);
  }, []);

  const handleRecommendationSelect = useCallback((row) => {
    setSelectedRecommendation(row);
    setSelectedInsight(null);
    if (row?.id) {
      trackClRecommendationOpened(row.id);
      trackClTraceViewed(row.id);
    }
  }, []);

  const handleInsightSelect = useCallback((insight) => {
    setSelectedInsight(insight);
    setSelectedRecommendation(null);
    if (insight?.id) trackClTraceViewed(insight.id);
  }, []);

  const runScenario = useCallback(
    (scenarioId) => {
      setActiveScenarioId(scenarioId);
      const result = runScenarioSimulation(scenarioId, {
        snapshot,
        wiAnalytics: { ...wiAnalytics, healthScore: kpiBundle.healthScore, riskScore: kpiBundle.riskScore }
      });
      setScenarioResult(result);
      if (result) trackClScenarioExecuted(scenarioId, result.params);
    },
    [snapshot, wiAnalytics, kpiBundle]
  );

  return {
    rows: filteredRows,
    allRows: recommendationRows,
    loading,
    error,
    errorType,
    reload: load,
    loadMeta,
    search,
    setSearch: handleSearch,
    priorityFilter,
    setPriorityFilter: handlePriorityFilter,
    kpis: kpiBundle.items,
    kpiPartial: kpiBundle.partial,
    healthScore: kpiBundle.healthScore,
    riskScore: kpiBundle.riskScore,
    insights,
    recommendations,
    decisionTrace,
    scenarios: CL_SCENARIO_CATALOG,
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
    timelineWarehouseOptions: snapshot.warehouses.map((w) => ({ id: w.id, code: w.code, name: w.name })),
    timelineEvents,
    selectedRecommendation,
    setSelectedRecommendation: handleRecommendationSelect,
    selectedInsight,
    setSelectedInsight: handleInsightSelect
  };
}

export { MODULE_ID, PHASE };
