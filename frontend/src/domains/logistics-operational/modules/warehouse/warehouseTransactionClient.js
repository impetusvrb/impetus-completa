/**
 * OPM-001C — Cliente transaccional Warehouse (POST existente · sem novos endpoints).
 */
import wmsV1Api from '../../services/wmsV1ApiClient.js';
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const PHASE = 'OPM-001C';

export async function createWarehouse(payload) {
  const t0 = Date.now();
  logWmsUiEvent({ event: 'WH_CREATE_START', phase: PHASE, code: payload?.code });
  try {
    const res = await wmsV1Api.createWarehouse(payload);
    logWmsUiEvent({
      event: 'WH_CREATE_OK',
      phase: PHASE,
      duration_ms: Date.now() - t0,
      warehouse_id: res?.data?.id
    });
    return res?.data ?? res;
  } catch (e) {
    logWmsUiEvent({
      event: 'WH_CREATE_FAIL',
      phase: PHASE,
      duration_ms: Date.now() - t0,
      reason: String(e.message || 'operational_error')
    });
    throw e;
  }
}
