import { useCallback, useEffect, useMemo, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { computeWarehouseKpis } from './warehouseKpiUtils.js';
import { filterWarehouses } from './warehouseListUtils.js';

const MODULE_ID = 'warehouses';
const PHASE = 'OPM-001C';
const LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function fetchCapacitySafe(id) {
  try {
    const res = await wmsV1Api.warehouseCapacity(id);
    return res?.data ?? res;
  } catch {
    return null;
  }
}

export function useWarehouseFoundation() {
  const [rows, setRows] = useState([]);
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [loadMeta, setLoadMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    setErrorType(null);
    logWmsUiEvent({ event: 'WH_FOUNDATION_LOAD_START', module: MODULE_ID, phase: PHASE });

    try {
      const [whRes, balRes, movRes] = await withTimeout(
        Promise.all([
          wmsV1Api.listWarehouses(),
          wmsV1Api.listBalances().catch(() => ({ data: [] })),
          wmsV1Api.listMovements().catch(() => ({ data: [] }))
        ]),
        LOAD_TIMEOUT_MS
      );

      const whRows = extractRows(whRes);
      const balRows = extractRows(balRes);
      const movRows = extractRows(movRes);

      const capResults = await Promise.all(whRows.slice(0, 50).map((w) => fetchCapacitySafe(w.id)));
      const caps = capResults.filter(Boolean);

      setRows(whRows);
      setBalances(balRows);
      setMovements(movRows);
      setCapacities(caps);

      const duration_ms = Date.now() - t0;
      setLoadMeta({ duration_ms, loaded_at: new Date().toISOString(), count: whRows.length });
      logWmsUiEvent({
        event: 'WH_FOUNDATION_LOAD_OK',
        module: MODULE_ID,
        phase: PHASE,
        duration_ms,
        warehouses: whRows.length,
        partial_capacity: caps.length < whRows.length
      });
    } catch (e) {
      const duration_ms = Date.now() - t0;
      const isTimeout = String(e.message).includes('timeout');
      const type = isTimeout ? 'timeout' : classifyWmsError(e);
      setError(type);
      setErrorType(type);
      logWmsUiEvent({
        event: 'WH_FOUNDATION_LOAD_FAIL',
        module: MODULE_ID,
        phase: PHASE,
        duration_ms,
        reason: isTimeout ? 'timeout' : 'operational_error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(
    () => filterWarehouses(rows, { search, statusFilter }),
    [rows, search, statusFilter]
  );

  const kpiBundle = useMemo(
    () => computeWarehouseKpis({ warehouses: rows, balances, movements, capacities }),
    [rows, balances, movements, capacities]
  );

  return {
    rows: filteredRows,
    allRows: rows,
    loading,
    error,
    errorType,
    reload: load,
    loadMeta,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    kpis: kpiBundle.items,
    kpiPartial: kpiBundle.partial,
    kpiGaps: kpiBundle.gaps,
    movements,
    balances,
    capacities
  };
}
