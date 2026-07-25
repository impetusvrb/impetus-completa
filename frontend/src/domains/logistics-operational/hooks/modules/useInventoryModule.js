import { useCallback } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { useWmsModuleData, extractRows } from '../useWmsModuleData.js';

const MODULE_ID = 'inventory';

export function useInventoryModule() {
  const fetcher = useCallback(() => wmsV1Api.listItems(), []);
  const { data, loading, error, reload } = useWmsModuleData(MODULE_ID, fetcher);
  return { rows: extractRows(data), loading, error, reload };
}

export const INVENTORY_COLUMNS = [
  { key: 'item_code', label: 'Item' },
  { key: 'description', label: 'Descrição' },
  { key: 'uom', label: 'UOM' }
];
