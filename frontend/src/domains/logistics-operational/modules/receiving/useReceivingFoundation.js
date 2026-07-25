import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computeReceivingKpis, computeReceivingIntelligence } from './receivingKpiUtils.js';
import { filterReceivingRows } from './receivingListUtils.js';
import { buildReceivingRows, buildReceivingTimelineEvents } from './receivingRowUtils.js';
import { buildDockOperationalView, loadAllDockLocations } from './receivingDockUtils.js';
import { buildReceivingTimelineDisplay } from './receivingTimelineUtils.js';
import {
  trackReceivingLoaded,
  trackReceivingFilter,
  trackReceivingSearch,
  trackReceivingExport
} from './receivingObservability.js';
import { completeReceivingWithInventory } from './receivingInventoryIntegration.js';
import { createReceivingAsn, validateAsnForm } from './receivingAsnUtils.js';

const MODULE_ID = 'receiving';
const PHASE = 'OPM-003';
const LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

export function useReceivingFoundation() {
  const [orders, setOrders] = useState([]);
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
  const [timelineDockFilter, setTimelineDockFilter] = useState('');
  const [timelineSupplierFilter, setTimelineSupplierFilter] = useState('');
  const [completingId, setCompletingId] = useState(null);

  const load = useCallback(async () => {
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const [rcvRes, whRes] = await withTimeout(
        Promise.all([wmsV1Api.listReceiving(), wmsV1Api.listWarehouses().catch(() => ({ data: [] }))]),
        LOAD_TIMEOUT_MS
      );

      const orderRows = extractRows(rcvRes);
      const whRows = extractRows(whRes);
      const dockRows = await loadAllDockLocations(whRows, (id) => wmsV1Api.listLocations(id));

      setOrders(orderRows);
      setWarehouses(whRows);
      setDocks(dockRows);

      const duration_ms = Date.now() - t0;
      const meta = { duration_ms, loaded_at: new Date().toISOString(), orders: orderRows.length, docks: dockRows.length };
      setLoadMeta(meta);
      trackReceivingLoaded(meta);
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
    () => buildReceivingRows({ orders, warehouses, docks }),
    [orders, warehouses, docks]
  );

  const filteredRows = useMemo(
    () => filterReceivingRows(gridRows, { search, statusFilter }),
    [gridRows, search, statusFilter]
  );

  const kpiBundle = useMemo(
    () => computeReceivingKpis({ orders, docks, loadMeta }),
    [orders, docks, loadMeta]
  );

  const intelligence = useMemo(
    () => computeReceivingIntelligence({ orders, docks }),
    [orders, docks]
  );

  const dockPanelRows = useMemo(
    () => buildDockOperationalView({ docks, orders }),
    [docks, orders]
  );

  const timelineSourceEvents = useMemo(() => buildReceivingTimelineEvents(orders), [orders]);

  const timelineEvents = useMemo(
    () =>
      buildReceivingTimelineDisplay({
        events: timelineSourceEvents,
        periodDays: timelinePeriodDays,
        supplierFilter: timelineSupplierFilter,
        dockFilter: timelineDockFilter,
        operatorFilter: timelineOperatorFilter
      }),
    [timelineSourceEvents, timelinePeriodDays, timelineSupplierFilter, timelineDockFilter, timelineOperatorFilter]
  );

  const timelineDockOptions = useMemo(
    () => docks.map((d) => ({ id: d.id, code: d.location_code || d.code, name: d.name })),
    [docks]
  );

  const timelineSupplierOptions = useMemo(() => {
    const seen = new Map();
    for (const o of orders) {
      const meta = o.metadata || {};
      const label = meta.supplier_name || o.supplier_ref;
      const id = meta.supplier_id || o.supplier_ref || label;
      if (id && label && !seen.has(id)) seen.set(id, { id, label });
    }
    return [...seen.values()];
  }, [orders]);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (value.trim()) trackReceivingSearch(value.trim().length);
  }, []);

  const handleStatusFilter = useCallback((id) => {
    setStatusFilter(id);
    trackReceivingFilter(id);
  }, []);

  const completeReceiving = useCallback(
    async (order) => {
      if (!order?.id || completingId) return;
      setCompletingId(order.id);
      try {
        await completeReceivingWithInventory(order);
        await load();
      } catch (e) {
        setError(e.message);
        setErrorType(classifyWmsError(e));
      } finally {
        setCompletingId(null);
      }
    },
    [completingId, load]
  );

  const createAsn = useCallback(
    async (form) => {
      const errors = validateAsnForm(form);
      if (errors.length) throw new Error(errors.join(' · '));
      await createReceivingAsn(wmsV1Api, {
        ...form,
        expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : null
      });
      await load();
    },
    [load]
  );

  return {
    rows: filteredRows,
    allRows: gridRows,
    orders,
    warehouses,
    docks,
    dockPanelRows,
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
    timelineDockFilter,
    setTimelineDockFilter,
    timelineSupplierFilter,
    setTimelineSupplierFilter,
    timelineDockOptions,
    timelineSupplierOptions,
    timelineEvents,
    kpis: kpiBundle.items,
    kpiPartial: kpiBundle.partial,
    intelligence,
    completeReceiving,
    completingId,
    createAsn
  };
}

export { MODULE_ID, PHASE };
