import { useCallback, useEffect, useState } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { extractRows } from '../../hooks/useWmsModuleData.js';
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';
import { unavailableLabel } from './warehouseOperationalMessages.js';

const PHASE = 'OPM-001B';

export function useWarehouseDetail(warehouseId) {
  const [detail, setDetail] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!warehouseId) {
      setDetail(null);
      setCapacity(null);
      setLocations([]);
      return;
    }
    const t0 = Date.now();
    setLoading(true);
    setError(null);
    logWmsUiEvent({ event: 'WH_DETAIL_LOAD_START', warehouse_id: warehouseId, phase: PHASE });

    try {
      const [whRes, capRes, locRes] = await Promise.all([
        wmsV1Api.getWarehouse(warehouseId),
        wmsV1Api.warehouseCapacity(warehouseId).catch(() => null),
        wmsV1Api.listLocations(warehouseId).catch(() => ({ data: [] }))
      ]);
      setDetail(whRes?.data ?? whRes);
      setCapacity(capRes?.data ?? capRes);
      setLocations(extractRows(locRes));
      logWmsUiEvent({
        event: 'WH_DETAIL_LOAD_OK',
        warehouse_id: warehouseId,
        phase: PHASE,
        duration_ms: Date.now() - t0
      });
    } catch {
      setError('detail_load_failed');
      logWmsUiEvent({
        event: 'WH_DETAIL_LOAD_FAIL',
        warehouse_id: warehouseId,
        phase: PHASE,
        duration_ms: Date.now() - t0
      });
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  return { detail, capacity, locations, loading, error, reload: load };
}

export function formatWarehouseDetailFields(detail, capacity, locations) {
  if (!detail) return [];
  const meta = detail.metadata || {};
  const locLabel =
    meta.location || meta.city || meta.address
      ? [meta.address, meta.city, meta.region].filter(Boolean).join(' · ')
      : unavailableLabel();

  const capUnits = capacity?.capacity_units;
  const locCount = capacity?.location_count ?? locations.length;

  return [
    { label: 'Código', value: detail.code || '—' },
    { label: 'Nome', value: detail.name || '—' },
    { label: 'Identificação', value: detail.id || '—' },
    { label: 'Localização', value: locLabel },
    { label: 'Tipo', value: detail.warehouse_type || '—' },
    { label: 'Status', value: detail.status || '—' },
    {
      label: 'Capacidade (unidades)',
      value: capUnits != null ? capUnits : unavailableLabel()
    },
    {
      label: 'Utilização (posições)',
      value: locCount != null ? locCount : unavailableLabel()
    },
    { label: 'Posições registadas', value: locations.length },
    {
      label: 'Actualizado',
      value: detail.updated_at ? new Date(detail.updated_at).toLocaleString('pt-BR') : '—'
    }
  ];
}
