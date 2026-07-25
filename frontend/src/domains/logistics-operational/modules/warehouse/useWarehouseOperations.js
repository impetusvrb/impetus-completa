import { useCallback, useState } from 'react';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';
import { assessWarehouseOperation, WAREHOUSE_OPS } from './warehouseOperationsGuard.js';
import { createWarehouse } from './warehouseTransactionClient.js';
import { toWarehouseOperationalMessage } from './warehouseOperationalMessages.js';

const PHASE = 'OPM-001C';

const INITIAL_FORM = Object.freeze({
  code: '',
  name: '',
  warehouse_type: 'standard',
  metadata: { capacity_units: '' }
});

export function useWarehouseOperations({ onSuccess } = {}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const openCreate = useCallback(() => {
    const check = assessWarehouseOperation(WAREHOUSE_OPS.create);
    if (!check.allowed) {
      setFeedback({ type: 'warning', message: check.message });
      logWmsUiEvent({ event: 'WH_CREATE_BLOCKED', phase: PHASE, reason: check.reason });
      return;
    }
    setForm({ ...INITIAL_FORM });
    setCreateOpen(true);
    setFeedback(null);
  }, []);

  const openEdit = useCallback(() => {
    const check = assessWarehouseOperation(WAREHOUSE_OPS.edit);
    setFeedback({ type: 'info', message: check.message, gapId: check.gapId });
    setEditOpen(true);
    logWmsUiEvent({ event: 'WH_EDIT_BLOCKED', phase: PHASE, gap: check.gapId });
  }, []);

  const closeCreate = useCallback(() => {
    if (submitting) return;
    setCreateOpen(false);
    logWmsUiEvent({ event: 'WH_CREATE_CANCEL', phase: PHASE });
  }, [submitting]);

  const closeEdit = useCallback(() => setEditOpen(false), []);

  const updateField = useCallback((key, value) => {
    setForm((prev) => {
      if (key === 'capacity_units') {
        return { ...prev, metadata: { ...prev.metadata, capacity_units: value } };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const submitCreate = useCallback(async () => {
    const check = assessWarehouseOperation(WAREHOUSE_OPS.create);
    if (!check.allowed) {
      setFeedback({ type: 'warning', message: check.message });
      return;
    }
    if (!form.code.trim() || !form.name.trim()) {
      setFeedback({ type: 'warning', message: 'Código e nome são obrigatórios.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        warehouse_type: form.warehouse_type || 'standard'
      };
      const cap = form.metadata?.capacity_units;
      if (cap !== '' && cap != null) {
        payload.metadata = { capacity_units: Number(cap) };
      }
      await createWarehouse(payload);
      setCreateOpen(false);
      setForm({ ...INITIAL_FORM });
      setFeedback({ type: 'success', message: 'Armazém registado com sucesso.' });
      onSuccess?.();
    } catch (e) {
      const type = classifyWmsError(e);
      setFeedback({
        type: 'error',
        message: toWarehouseOperationalMessage(type === 'permission_denied' ? 'permission_denied' : 'operational_error')
      });
    } finally {
      setSubmitting(false);
    }
  }, [form, onSuccess]);

  return {
    createOpen,
    editOpen,
    form,
    submitting,
    feedback,
    openCreate,
    openEdit,
    closeCreate,
    closeEdit,
    updateField,
    submitCreate,
    setFeedback
  };
}
