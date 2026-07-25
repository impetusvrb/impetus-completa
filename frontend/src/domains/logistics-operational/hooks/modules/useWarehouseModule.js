import { useCallback } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { useWmsModuleData, extractRows } from '../useWmsModuleData.js';

const MODULE_ID = 'warehouses';

export function useWarehouseModule() {
  const fetcher = useCallback(() => wmsV1Api.listWarehouses(), []);
  const { data, loading, error, reload } = useWmsModuleData(MODULE_ID, fetcher);
  return { rows: extractRows(data), loading, error, reload };
}

export const WAREHOUSE_COLUMNS = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'status', label: 'Status' }
];
