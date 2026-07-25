import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computePickingKpis, computePickingIntelligence } from './pickingKpiUtils.js';
import { filterPickingRows } from './pickingListUtils.js';
import { buildPickingRows, buildPickingTimelineEvents } from './pickingRowUtils.js';
import { buildPickingWaves, listWaveFilterOptions } from './pickingWaveUtils.js';
import { buildActiveRoutes } from './pickingRouteUtils.js';
import { buildPickingTimelineDisplay } from './pickingTimelineUtils.js';
import {
  trackPickingLoaded,
  trackPickingFilter,
  trackPickingSearch,
  trackPickingPaused,
  trackPickingDivergence
} from './pickingObservability.js';
import { startPickingOrder, completePickingWithInventory } from './pickingInventoryIntegration.js';

const MODULE_ID = 'picking';
const PHASE = 'OPM-004';
const LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

export function usePickingFoundation() {
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [loadMeta, setLoadMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [waveFilter, setWaveFilter] = useState('all');
  const [timelinePeriodDays, setTimelinePeriodDays] = useState(30);
  const [timelineOperatorFilter, setTimelineOperatorFilter] = useState('');
  const [timelineWaveFilter, setTimelineWaveFilter] = useState('');
  const [timelineOrderFilter, setTimelineOrderFilter] = useState('');
  const [actionBusyId, setActionBusyId] = useState(null);
  const [routeViewId, setRouteViewId] = useState(null);

  const load = useCallback(async () => {
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const [pickRes, whRes] = await withTimeout(
        Promise.all([wmsV1Api.listPicking(), wmsV1Api.listWarehouses().catch(() => ({ data: [] }))]),
        LOAD_TIMEOUT_MS
      );

      const orderRows = extractRows(pickRes);
      const whRows = extractRows(whRes);

      setOrders(orderRows);
      setWarehouses(whRows);

      const duration_ms = Date.now() - t0;
      const meta = { duration_ms, loaded_at: new Date().toISOString(), orders: orderRows.length };
      setLoadMeta(meta);
      trackPickingLoaded(meta);
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

  const gridRows = useMemo(() => buildPickingRows({ orders, warehouses }), [orders, warehouses]);

  const filteredRows = useMemo(
    () => filterPickingRows(gridRows, { search, statusFilter, waveFilter }),
    [gridRows, search, statusFilter, waveFilter]
  );

  const kpiBundle = useMemo(() => computePickingKpis({ orders, loadMeta }), [orders, loadMeta]);

  const intelligence = useMemo(() => computePickingIntelligence({ orders }), [orders]);

  const waves = useMemo(() => buildPickingWaves(orders), [orders]);

  const activeRoutes = useMemo(() => buildActiveRoutes(gridRows), [gridRows]);

  const timelineSourceEvents = useMemo(() => buildPickingTimelineEvents(orders), [orders]);

  const timelineEvents = useMemo(
    () =>
      buildPickingTimelineDisplay({
        events: timelineSourceEvents,
        periodDays: timelinePeriodDays,
        operatorFilter: timelineOperatorFilter,
        waveFilter: timelineWaveFilter,
        orderFilter: timelineOrderFilter
      }),
    [timelineSourceEvents, timelinePeriodDays, timelineOperatorFilter, timelineWaveFilter, timelineOrderFilter]
  );

  const timelineWaveOptions = useMemo(() => listWaveFilterOptions(waves), [waves]);

  const timelineOrderOptions = useMemo(
    () => orders.map((o) => ({ id: o.id, label: o.order_number || String(o.id).slice(0, 8) })),
    [orders]
  );

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (value.trim()) trackPickingSearch(value.trim().length);
  }, []);

  const handleStatusFilter = useCallback((id) => {
    setStatusFilter(id);
    trackPickingFilter(id);
  }, []);

  const startPicking = useCallback(
    async (order) => {
      if (!order?.id || actionBusyId) return;
      setActionBusyId(order.id);
      try {
        await startPickingOrder(order);
        await load();
      } catch (e) {
        setError(e.message);
        setErrorType(classifyWmsError(e));
      } finally {
        setActionBusyId(null);
      }
    },
    [actionBusyId, load]
  );

  const pausePicking = useCallback((order) => {
    if (!order?.id) return;
    trackPickingPaused(order.id);
    if (order.metadata?.divergence) trackPickingDivergence(order.id);
  }, []);

  const completePicking = useCallback(
    async (order) => {
      if (!order?.id || actionBusyId) return;
      setActionBusyId(order.id);
      try {
        await completePickingWithInventory(order);
        await load();
      } catch (e) {
        setError(e.message);
        setErrorType(classifyWmsError(e));
      } finally {
        setActionBusyId(null);
      }
    },
    [actionBusyId, load]
  );

  const viewRoute = useCallback((orderId) => {
    setRouteViewId(orderId);
  }, []);

  return {
    rows: filteredRows,
    allRows: gridRows,
    orders,
    warehouses,
    waves,
    activeRoutes,
    loading,
    error,
    errorType,
    reload: load,
    loadMeta,
    search,
    setSearch: handleSearch,
    statusFilter,
    setStatusFilter: handleStatusFilter,
    waveFilter,
    setWaveFilter,
    timelinePeriodDays,
    setTimelinePeriodDays,
    timelineOperatorFilter,
    setTimelineOperatorFilter,
    timelineWaveFilter,
    setTimelineWaveFilter,
    timelineOrderFilter,
    setTimelineOrderFilter,
    timelineWaveOptions,
    timelineOrderOptions,
    timelineEvents,
    kpis: kpiBundle.items,
    kpiPartial: kpiBundle.partial,
    intelligence,
    startPicking,
    pausePicking,
    completePicking,
    actionBusyId,
    viewRoute,
    routeViewId
  };
}

export { MODULE_ID, PHASE };
