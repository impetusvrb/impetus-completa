import { useCallback } from 'react';
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { useWmsModuleData, extractRows } from '../useWmsModuleData.js';

const MODULE_ID = 'transfers';

export function useTransferModule() {
  const fetcher = useCallback(() => wmsV1Api.listTransfers(), []);
  const { data, loading, error, reload } = useWmsModuleData(MODULE_ID, fetcher);
  return { rows: extractRows(data), loading, error, reload };
}

export const TRANSFER_COLUMNS = [
  { key: 'document_number', label: 'Documento' },
  { key: 'status', label: 'Status' }
];
