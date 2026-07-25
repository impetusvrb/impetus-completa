import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computeShippingKpis, computeShippingIntelligence } from './shippingKpiUtils.js';
import { filterShippingRows } from './shippingListUtils.js';
import {
  buildShippingRows,
  buildShippingTimelineEvents,
  linkCompletedPickingOrders
} from './shippingRowUtils.js';
import { buildLoadConsolidationView } from './shippingLoadUtils.js';
import { loadAllOutboundDocks, buildOutboundDockView } from './shippingDockUtils.js';
import { buildShippingTimelineDisplay } from './shippingTimelineUtils.js';
import {
  trackShippingLoaded,
  trackShippingFilter,
  trackShippingSearch,
  trackShippingDivergence
} from './shippingObservability.js';
import { startShippingLoading, dispatchShippingWithInventory } from './shippingInventoryIntegration.js';

const MODULE_ID = 'shipping';
const PHASE = 'OPM-005';
const LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

export function useShippingFoundation() {
  const [orders, setOrders] = useState([]);
  const [pickingOrders, setPickingOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [docks, setDocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [loadMeta, setLoadMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timelinePeriodDays, setTimelinePeriodDays] = useState(30);
  const [timelineOperatorFilter, setTimelineOperatorFilter] = useState('');
  const [timelineCarrierFilter, setTimelineCarrierFilter] = useState('');
  const [timelineDockFilter, setTimelineDockFilter] = useState('');
  const [timelineOrderFilter, setTimelineOrderFilter] = useState('');
  const [actionBusyId, setActionBusyId] = useState(null);

  const load = useCallback(async () => {
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const [shipRes, pickRes, whRes] = await withTimeout(
        Promise.all([
          wmsV1Api.listShipping(),
          wmsV1Api.listPicking().catch(() => ({ data: [] })),
          wmsV1Api.listWarehouses().catch(() => ({ data: [] }))
        ]),
        LOAD_TIMEOUT_MS
      );

      const orderRows = extractRows(shipRes);
      const pickRows = extractRows(pickRes);
      const whRows = extractRows(whRes);
      const dockRows = await loadAllOutboundDocks(whRows, (id) => wmsV1Api.listLocations(id));

      setOrders(orderRows);
      setPickingOrders(pickRows);
      setWarehouses(whRows);
      setDocks(dockRows);

      const duration_ms = Date.now() - t0;
      const meta = { duration_ms, loaded_at: new Date().toISOString(), orders: orderRows.length, picking: pickRows.length };
      setLoadMeta(meta);
      trackShippingLoaded(meta);
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

  const gridRows = useMemo(
    () => buildShippingRows({ orders, warehouses, docks }),
    [orders, warehouses, docks]
  );

  const filteredRows = useMemo(
    () => filterShippingRows(gridRows, { search, statusFilter }),
    [gridRows, search, statusFilter]
  );

  const kpiBundle = useMemo(
    () => computeShippingKpis({ orders, docks, loadMeta }),
    [orders, docks, loadMeta]
  );

  const intelligence = useMemo(() => computeShippingIntelligence({ orders }), [orders]);

  const loadPanels = useMemo(() => buildLoadConsolidationView(orders), [orders]);

  const dockPanelRows = useMemo(
    () => buildOutboundDockView({ docks, orders }),
    [docks, orders]
  );

  const pickingCandidates = useMemo(
    () => linkCompletedPickingOrders(pickingOrders, orders),
    [pickingOrders, orders]
  );

  const timelineSourceEvents = useMemo(() => buildShippingTimelineEvents(orders), [orders]);

  const timelineEvents = useMemo(
    () =>
      buildShippingTimelineDisplay({
        events: timelineSourceEvents,
        periodDays: timelinePeriodDays,
        carrierFilter: timelineCarrierFilter,
        operatorFilter: timelineOperatorFilter,
        dockFilter: timelineDockFilter,
        orderFilter: timelineOrderFilter
      }),
    [
      timelineSourceEvents,
      timelinePeriodDays,
      timelineCarrierFilter,
      timelineOperatorFilter,
      timelineDockFilter,
      timelineOrderFilter
    ]
  );

  const timelineDockOptions = useMemo(
    () => docks.map((d) => ({ id: d.id, code: d.location_code || d.code, name: d.name })),
    [docks]
  );

  const timelineOrderOptions = useMemo(
    () => orders.map((o) => ({ id: o.id, label: o.order_number || String(o.id).slice(0, 8) })),
    [orders]
  );

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (value.trim()) trackShippingSearch(value.trim().length);
  }, []);

  const handleStatusFilter = useCallback((id) => {
    setStatusFilter(id);
    trackShippingFilter(id);
  }, []);

  const startLoading = useCallback(
    async (order) => {
      if (!order?.id || actionBusyId) return;
      setActionBusyId(order.id);
      try {
        await startShippingLoading(order);
        if (order.metadata?.divergence) trackShippingDivergence(order.id);
      } finally {
        setActionBusyId(null);
      }
    },
    [actionBusyId]
  );

  const dispatchShipping = useCallback(
    async (order) => {
      if (!order?.id || actionBusyId) return;
      setActionBusyId(order.id);
      try {
        await dispatchShippingWithInventory(order);
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

  return {
    rows: filteredRows,
    allRows: gridRows,
    orders,
    warehouses,
    docks,
    loadPanels,
    dockPanelRows,
    pickingCandidates,
    loading,
    error,
    errorType,
    reload: load,
    loadMeta,
    search,
    setSearch: handleSearch,
    statusFilter,
    setStatusFilter: handleStatusFilter,
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
    timelineDockOptions,
    timelineOrderOptions,
    timelineEvents,
    kpis: kpiBundle.items,
    kpiPartial: kpiBundle.partial,
    intelligence,
    startLoading,
    dispatchShipping,
    actionBusyId
  };
}

export { MODULE_ID, PHASE };
