import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computeWiDashboardKpis } from './wiKpiUtils.js';
import { computeWiHeatmaps } from './wiHeatmapUtils.js';
import { computeWiCapacityAnalytics } from './wiCapacityUtils.js';
import { computeWiBottlenecks } from './wiBottleneckUtils.js';
import { computeWiFlowAnalytics } from './wiFlowAnalyticsUtils.js';
import { computeWiRecommendations, buildRecommendationRows } from './wiRecommendationUtils.js';
import {
  buildWiConsolidatedTimelineEvents,
  buildWiTimelineDisplay,
  computeWiPerformance
} from './wiTimelineUtils.js';
import { filterWiRecommendationRows } from './wiListUtils.js';
import {
  trackWiLoaded,
  trackWiSearch,
  trackWiAnalyticsFilter,
  trackWiHeatmapViewed,
  trackWiCapacityAnalyzed,
  trackWiBottleneckDetected,
  trackWiFlowAnalyzed,
  trackWiRecommendationOpened
} from './wiObservability.js';

const MODULE_ID = 'warehouse_intelligence';
const PHASE = 'OPM-007';
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

/** Read-only — consolida WMS-003 sem mutações. */
export function useWarehouseIntelligenceFoundation() {
  const [warehouses, setWarehouses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [receiving, setReceiving] = useState([]);
  const [picking, setPicking] = useState([]);
  const [shipping, setShipping] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [loadMeta, setLoadMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [timelinePeriodDays, setTimelinePeriodDays] = useState(30);
  const [timelineWarehouseFilter, setTimelineWarehouseFilter] = useState('');
  const [timelineDomainFilter, setTimelineDomainFilter] = useState('all');
  const [timelineOperatorFilter, setTimelineOperatorFilter] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

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

      setWarehouses(whRows);
      setBalances(extractRows(balRes));
      setMovements(extractRows(movRes));
      setReceiving(extractRows(rcvRes));
      setPicking(extractRows(pckRes));
      setShipping(extractRows(shpRes));
      setTransfers(extractRows(xfrRes));
      setCapacities(capRows);

      const duration_ms = Date.now() - t0;
      const meta = {
        duration_ms,
        loaded_at: new Date().toISOString(),
        sources: 7,
        read_only: true
      };
      setLoadMeta(meta);
      trackWiLoaded(meta);
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

  const snapshot = useMemo(
    () => ({ warehouses, balances, movements, receiving, picking, shipping, transfers, capacities }),
    [warehouses, balances, movements, receiving, picking, shipping, transfers, capacities]
  );

  const heatmaps = useMemo(() => computeWiHeatmaps(snapshot), [snapshot]);
  const capacity = useMemo(() => computeWiCapacityAnalytics(snapshot), [snapshot]);
  const bottlenecks = useMemo(() => computeWiBottlenecks(snapshot), [snapshot]);
  const flow = useMemo(() => computeWiFlowAnalytics(snapshot), [snapshot]);
  const performance = useMemo(() => computeWiPerformance(snapshot), [snapshot]);

  const recommendations = useMemo(
    () => computeWiRecommendations({ heatmaps, capacity, bottlenecks, flow, transfers }),
    [heatmaps, capacity, bottlenecks, flow, transfers]
  );

  useEffect(() => {
    if (bottlenecks.length) {
      for (const b of bottlenecks) trackWiBottleneckDetected(b.module, b.count);
    }
    if (flow?.stages?.length) trackWiFlowAnalyzed(flow.stages.length);
  }, [bottlenecks, flow]);

  const recommendationRows = useMemo(() => buildRecommendationRows(recommendations), [recommendations]);
  const filteredRows = useMemo(
    () => filterWiRecommendationRows(recommendationRows, { search, priorityFilter }),
    [recommendationRows, search, priorityFilter]
  );

  const timelineSource = useMemo(
    () => buildWiConsolidatedTimelineEvents(snapshot),
    [snapshot]
  );

  const timelineEvents = useMemo(
    () =>
      buildWiTimelineDisplay({
        events: timelineSource,
        periodDays: timelinePeriodDays,
        warehouseFilter: timelineWarehouseFilter,
        domainFilter: timelineDomainFilter,
        operatorFilter: timelineOperatorFilter,
        limit: 30
      }),
    [timelineSource, timelinePeriodDays, timelineWarehouseFilter, timelineDomainFilter, timelineOperatorFilter]
  );

  const kpiBundle = useMemo(() => computeWiDashboardKpis(snapshot), [snapshot]);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (value.trim()) trackWiSearch(value.trim().length);
  }, []);

  const handlePriorityFilter = useCallback((id) => {
    setPriorityFilter(id);
    trackWiAnalyticsFilter(id);
  }, []);

  const handleHeatmapView = useCallback((viewId, detail) => {
    trackWiHeatmapViewed(`${viewId}:${detail}`);
  }, []);

  const handleCapacityAnalyze = useCallback((warehouseId) => {
    trackWiCapacityAnalyzed(warehouseId);
  }, []);

  const handleRecommendationSelect = useCallback((row) => {
    setSelectedRecommendation(row);
    if (row?.id) trackWiRecommendationOpened(row.id);
  }, []);

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
    heatmaps,
    capacity,
    bottlenecks,
    flow,
    performance,
    recommendations,
    timelinePeriodDays,
    setTimelinePeriodDays,
    timelineWarehouseFilter,
    setTimelineWarehouseFilter,
    timelineDomainFilter,
    setTimelineDomainFilter,
    timelineOperatorFilter,
    setTimelineOperatorFilter,
    timelineWarehouseOptions: warehouses.map((w) => ({ id: w.id, code: w.code, name: w.name })),
    timelineEvents,
    selectedRecommendation,
    setSelectedRecommendation: handleRecommendationSelect,
    onHeatmapView: handleHeatmapView,
    onCapacityAnalyze: handleCapacityAnalyze
  };
}

export { MODULE_ID, PHASE };
