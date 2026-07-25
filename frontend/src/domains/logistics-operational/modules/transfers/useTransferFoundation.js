import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computeTransferKpis, computeTransferIntelligence } from './transferKpiUtils.js';
import { filterTransferRows } from './transferListUtils.js';
import { buildTransferRows, buildTransferTimelineEvents } from './transferRowUtils.js';
import {
  buildTransferTimelineDisplay,
  buildTransferTypePanels
} from './transferTimelineUtils.js';
import {
  trackTransferLoaded,
  trackTransferFilter,
  trackTransferSearch,
  trackTransferDivergence
} from './transferObservability.js';
import {
  startTransferExecution,
  completeTransferWithInventory
} from './transferInventoryIntegration.js';

const MODULE_ID = 'transfers';
const PHASE = 'OPM-006';
const LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

export function useTransferFoundation() {
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [loadMeta, setLoadMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timelinePeriodDays, setTimelinePeriodDays] = useState(30);
  const [timelineOperatorFilter, setTimelineOperatorFilter] = useState('');
  const [timelineWarehouseFilter, setTimelineWarehouseFilter] = useState('');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState('all');
  const [actionBusyId, setActionBusyId] = useState(null);

  const load = useCallback(async () => {
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const [xferRes, whRes] = await withTimeout(
        Promise.all([
          wmsV1Api.listTransfers(),
          wmsV1Api.listWarehouses().catch(() => ({ data: [] }))
        ]),
        LOAD_TIMEOUT_MS
      );

      const orderRows = extractRows(xferRes);
      const whRows = extractRows(whRes);
      setOrders(orderRows);
      setWarehouses(whRows);

      const duration_ms = Date.now() - t0;
      const meta = { duration_ms, loaded_at: new Date().toISOString(), orders: orderRows.length };
      setLoadMeta(meta);
      trackTransferLoaded(meta);
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
    () => buildTransferRows({ orders, warehouses }),
    [orders, warehouses]
  );

  const filteredRows = useMemo(
    () => filterTransferRows(gridRows, { search, statusFilter, typeFilter }),
    [gridRows, search, statusFilter, typeFilter]
  );

  const kpiBundle = useMemo(
    () => computeTransferKpis({ orders, loadMeta }),
    [orders, loadMeta]
  );

  const intelligence = useMemo(() => computeTransferIntelligence({ orders }), [orders]);

  const typePanels = useMemo(() => buildTransferTypePanels(orders), [orders]);

  const routePanelRows = useMemo(
    () => gridRows.filter((r) => r.operational_status === 'executing' || r.operational_status === 'released'),
    [gridRows]
  );

  const timelineSourceEvents = useMemo(() => buildTransferTimelineEvents(orders), [orders]);

  const timelineEvents = useMemo(
    () =>
      buildTransferTimelineDisplay({
        events: timelineSourceEvents,
        periodDays: timelinePeriodDays,
        operatorFilter: timelineOperatorFilter,
        warehouseFilter: timelineWarehouseFilter,
        typeFilter: timelineTypeFilter
      }),
    [timelineSourceEvents, timelinePeriodDays, timelineOperatorFilter, timelineWarehouseFilter, timelineTypeFilter]
  );

  const timelineWarehouseOptions = useMemo(
    () => warehouses.map((w) => ({ id: w.id, code: w.code, name: w.name })),
    [warehouses]
  );

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (value.trim()) trackTransferSearch(value.trim().length);
  }, []);

  const handleStatusFilter = useCallback((id) => {
    setStatusFilter(id);
    trackTransferFilter(id);
  }, []);

  const handleTypeFilter = useCallback((id) => {
    setTypeFilter(id);
    trackTransferFilter(`type:${id}`);
  }, []);

  const startExecution = useCallback(
    async (order) => {
      if (!order?.id || actionBusyId) return;
      setActionBusyId(order.id);
      try {
        await startTransferExecution(order);
        if (order.metadata?.divergence) trackTransferDivergence(order.id);
      } finally {
        setActionBusyId(null);
      }
    },
    [actionBusyId]
  );

  const completeTransfer = useCallback(
    async (order) => {
      if (!order?.id || actionBusyId) return;
      setActionBusyId(order.id);
      try {
        await completeTransferWithInventory(order);
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
    typePanels,
    routePanelRows,
    loading,
    error,
    errorType,
    reload: load,
    loadMeta,
    search,
    setSearch: handleSearch,
    statusFilter,
    setStatusFilter: handleStatusFilter,
    typeFilter,
    setTypeFilter: handleTypeFilter,
    timelinePeriodDays,
    setTimelinePeriodDays,
    timelineOperatorFilter,
    setTimelineOperatorFilter,
    timelineWarehouseFilter,
    setTimelineWarehouseFilter,
    timelineTypeFilter,
    setTimelineTypeFilter,
    timelineWarehouseOptions,
    timelineEvents,
    kpis: kpiBundle.items,
    kpiPartial: kpiBundle.partial,
    intelligence,
    startExecution,
    completeTransfer,
    actionBusyId
  };
}

export { MODULE_ID, PHASE };
