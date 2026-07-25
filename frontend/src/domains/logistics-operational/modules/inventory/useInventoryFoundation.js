import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computeInventoryKpis, computeInventoryIntelligence } from './inventoryKpiUtils.js';
import { filterInventoryRows } from './inventoryListUtils.js';
import { buildInventoryStockRows, enrichRowsWithLastMovement } from './inventoryStockUtils.js';
import { trackInventoryLoaded, trackInventoryFilter, trackInventorySearch } from './inventoryObservability.js';

const MODULE_ID = 'inventory';
const PHASE = 'OPM-002A';
const LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

function formatMovementCell(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export function useInventoryFoundation() {
  const [items, setItems] = useState([]);
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [loadMeta, setLoadMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timelinePeriodDays, setTimelinePeriodDays] = useState(30);
  const [timelineUserFilter, setTimelineUserFilter] = useState('');
  const [timelineWarehouseFilter, setTimelineWarehouseFilter] = useState('');
  const [timelineProductFilter, setTimelineProductFilter] = useState('');

  const load = useCallback(async () => {
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const [itemsRes, balRes, movRes, whRes] = await withTimeout(
        Promise.all([
          wmsV1Api.listItems(),
          wmsV1Api.listBalances().catch(() => ({ data: [] })),
          wmsV1Api.listMovements().catch(() => ({ data: [] })),
          wmsV1Api.listWarehouses().catch(() => ({ data: [] }))
        ]),
        LOAD_TIMEOUT_MS
      );

      const itemRows = extractRows(itemsRes);
      const balRows = extractRows(balRes);
      const movRows = extractRows(movRes);
      const whRows = extractRows(whRes);

      setItems(itemRows);
      setBalances(balRows);
      setMovements(movRows);
      setWarehouses(whRows);

      const duration_ms = Date.now() - t0;
      const meta = { duration_ms, loaded_at: new Date().toISOString(), items: itemRows.length, balances: balRows.length };
      setLoadMeta(meta);
      trackInventoryLoaded(meta);
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

  const stockRows = useMemo(() => {
    const base = buildInventoryStockRows({ items, balances, warehouses });
    return enrichRowsWithLastMovement(base, movements).map((r) => ({
      ...r,
      last_movement_at: formatMovementCell(r.last_movement_at)
    }));
  }, [items, balances, warehouses, movements]);

  const filteredRows = useMemo(
    () => filterInventoryRows(stockRows, { search, statusFilter }),
    [stockRows, search, statusFilter]
  );

  const kpiBundle = useMemo(
    () => computeInventoryKpis({ items, stockRows, movements, loadMeta }),
    [items, stockRows, movements, loadMeta]
  );

  const intelligence = useMemo(
    () => computeInventoryIntelligence({ stockRows, movements }),
    [stockRows, movements]
  );

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (value.trim()) trackInventorySearch(value.trim().length);
  }, []);

  const handleStatusFilter = useCallback((id) => {
    setStatusFilter(id);
    trackInventoryFilter(id);
  }, []);

  const timelineProducts = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        label: i.item_code || i.code || i.item_name || i.name || String(i.id).slice(0, 8)
      })),
    [items]
  );

  return {
    rows: filteredRows,
    allRows: stockRows,
    items,
    balances,
    movements,
    warehouses,
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
    timelineUserFilter,
    setTimelineUserFilter,
    timelineWarehouseFilter,
    setTimelineWarehouseFilter,
    timelineProductFilter,
    setTimelineProductFilter,
    timelineProducts,
    kpis: kpiBundle.items,
    kpiPartial: kpiBundle.partial,
    kpiGaps: kpiBundle.gaps,
    intelligence
  };
}

export { MODULE_ID, PHASE };
