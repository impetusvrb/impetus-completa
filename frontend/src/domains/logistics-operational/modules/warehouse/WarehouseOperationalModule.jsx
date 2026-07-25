import React, { useMemo, useState } from 'react';
import {
  IndustrialModuleLayout,
  IndustrialDataGrid,
  IndustrialSearchBar,
  IndustrialModuleStateView,
  MODULE_STATES,
  TOOLBAR_ACTIONS
} from '../../../../presentation/industrial-module/index.js';
import { canAccessWmsModule } from '../../config/wmsRbacNavigation.js';
import { classifyWmsError } from '../../utils/wmsErrorClassifier.js';
import { WmsModulePermissionDenied } from '../../components/WmsModuleStates.jsx';
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';
import WarehouseDetailsPanel from './WarehouseDetailsPanel.jsx';
import WarehouseCreateModal from './WarehouseCreateModal.jsx';
import WarehouseEditShell from './WarehouseEditShell.jsx';
import { useWarehouseDetail } from './useWarehouseDetail.js';
import { useWarehouseOperations } from './useWarehouseOperations.js';
import { WAREHOUSE_FOUNDATION_COLUMNS } from './warehouseColumns.jsx';
import { WAREHOUSE_STATUS_FILTERS } from './warehouseListUtils.js';
import { buildWarehouseOperationalTimeline } from './warehouseTimelineUtils.js';
import { exportWarehousesCsv } from './warehouseExport.js';
import { toWarehouseOperationalMessage, sanitizeOperationalDetail } from './warehouseOperationalMessages.js';
import { assessWarehouseOperation, WAREHOUSE_OPS } from './warehouseOperationsGuard.js';
import { canWriteWarehouse } from './warehouseOperationsRbac.js';
import './warehouse-module.css';

const MODULE_ID = 'warehouses';
const PHASE = 'OPM-001C';

function mapErrorType(error, errorType) {
  if (errorType) return errorType;
  if (error === 'timeout') return 'timeout';
  if (error) return classifyWmsError({ message: error });
  return null;
}

function resolveUiState({ loading, error, errorType, rows, kpiPartial }) {
  if (loading) return MODULE_STATES.loading;
  if (errorType === 'permission_denied') return MODULE_STATES.permission_denied;
  if (errorType === 'api_unavailable' || errorType === 'integration_unavailable') {
    return MODULE_STATES.integration_unavailable;
  }
  if (errorType === 'timeout') return MODULE_STATES.error;
  if (error) return MODULE_STATES.error;
  if (kpiPartial && rows?.length) return MODULE_STATES.partial_data;
  if (!rows?.length) return MODULE_STATES.empty;
  return MODULE_STATES.data_loaded;
}

export default function WarehouseOperationalModule({
  title,
  description,
  rows,
  allRows,
  loading,
  error,
  errorType: errorTypeProp,
  reload,
  kpis,
  kpiPartial,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  movements = [],
  loadMeta
}) {
  const [selectedRow, setSelectedRow] = useState(null);
  const detailState = useWarehouseDetail(selectedRow?.id);
  const ops = useWarehouseOperations({ onSuccess: reload });

  if (!canAccessWmsModule(MODULE_ID)) {
    return <WmsModulePermissionDenied moduleId={MODULE_ID} />;
  }

  const errorType = mapErrorType(error, errorTypeProp);
  const uiState = resolveUiState({ loading, error, errorType, rows, kpiPartial });
  const showGrid =
    uiState === MODULE_STATES.data_loaded ||
    uiState === MODULE_STATES.partial_data ||
    uiState === MODULE_STATES.read_only;

  const canCreate = assessWarehouseOperation(WAREHOUSE_OPS.create).allowed;
  const canEdit = false;
  const showHistory = false;

  const friendlyDetail = useMemo(() => {
    if (uiState === MODULE_STATES.empty) return toWarehouseOperationalMessage('empty');
    return sanitizeOperationalDetail(error) ?? toWarehouseOperationalMessage(errorType || 'error');
  }, [uiState, error, errorType]);

  const statusLabel = useMemo(() => {
    const base = uiState.replace(/_/g, ' ');
    const write = canWriteWarehouse() ? 'write' : 'read-only';
    if (loadMeta?.duration_ms != null) return `${base} · ${loadMeta.duration_ms}ms · ${write}`;
    return `${base} · ${write}`;
  }, [uiState, loadMeta]);

  const timelineEvents = useMemo(() => {
    if (!selectedRow?.id) return [];
    return buildWarehouseOperationalTimeline({
      detail: detailState.detail || selectedRow,
      movements,
      warehouseId: selectedRow.id
    });
  }, [movements, selectedRow, detailState.detail]);

  const filterButtons = useMemo(
    () =>
      WAREHOUSE_STATUS_FILTERS.map((f) => ({
        id: f.id,
        label: f.label,
        active: statusFilter === f.id
      })),
    [statusFilter]
  );

  const toolbarActions = useMemo(() => {
    const actions = [TOOLBAR_ACTIONS.refresh, TOOLBAR_ACTIONS.export];
    if (canCreate) actions.unshift(TOOLBAR_ACTIONS.search);
    return actions;
  }, [canCreate]);

  const handleToolbar = (action) => {
    if (action === TOOLBAR_ACTIONS.refresh && reload) {
      logWmsUiEvent({ event: 'WH_TOOLBAR_REFRESH', module: MODULE_ID, phase: PHASE });
      reload();
    }
  };

  const handleExport = () => {
    const check = assessWarehouseOperation(WAREHOUSE_OPS.export);
    if (!check.allowed) return;
    const exported = exportWarehousesCsv(rows);
    logWmsUiEvent({ event: exported ? 'WH_EXPORT_OK' : 'WH_EXPORT_EMPTY', module: MODULE_ID, phase: PHASE });
  };

  return (
    <div data-wms-module={MODULE_ID} data-wms-standalone="true" data-wms-phase={PHASE} data-opm-phase={PHASE}>
      <IndustrialModuleLayout
        moduleId={MODULE_ID}
        title={title}
        description={description}
        contextLabel="Operações · WMS · armazéns · camada transaccional segura"
        badge={PHASE}
        kpis={kpis}
        kpiColumns={6}
        toolbarActions={toolbarActions}
        toolbarStatus={statusLabel}
        onToolbarAction={handleToolbar}
        toolbarDisabled={loading}
        showSearch={false}
        showFilters={false}
        showCognitivePanels={false}
        actionBarActions={[]}
        phase={PHASE}
        timelineEvents={timelineEvents}
        detailsPanel={
          <WarehouseDetailsPanel
            open={!!selectedRow}
            warehouse={selectedRow}
            detailState={detailState}
            movements={movements}
            onClose={() => setSelectedRow(null)}
          />
        }
      >
        <div className="warehouse-ops-toolbar">
          {canCreate && (
            <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={ops.openCreate}>
              Novo
            </button>
          )}
          {canEdit ? (
            <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={ops.openEdit}>
              Editar
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ borderRadius: 4, fontSize: 11, opacity: 0.5 }}
              title="GAP-OPM-WH-006"
              onClick={ops.openEdit}
            >
              Editar
            </button>
          )}
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={reload} disabled={loading}>
            Actualizar
          </button>
          <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={handleExport} disabled={!rows.length}>
            Exportar
          </button>
          {showHistory ? (
            <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }}>
              Histórico
            </button>
          ) : null}
        </div>

        {ops.feedback && !ops.createOpen && (
          <p
            className="warehouse-ops-feedback"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: ops.feedback.type === 'success' ? 'var(--green)' : ops.feedback.type === 'error' ? 'var(--red)' : 'var(--amber)'
            }}
          >
            {ops.feedback.message}
          </p>
        )}

        <div className="warehouse-module-controls">
          <IndustrialSearchBar value={search} onChange={setSearch} disabled={false} placeholder="Pesquisar por código, nome ou tipo…" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {filterButtons.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`btn btn-ghost ${f.active ? 'warehouse-filter-active' : ''}`}
                style={{ borderRadius: 4, fontSize: 11 }}
                disabled={loading}
                onClick={() => setStatusFilter(f.id)}
                aria-pressed={f.active}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!showGrid && <IndustrialModuleStateView state={uiState} detail={friendlyDetail} moduleLabel={title} />}

        {showGrid && rows.length === 0 && search && (
          <IndustrialModuleStateView state={MODULE_STATES.empty} detail="Nenhum armazém corresponde aos filtros aplicados." moduleLabel={title} />
        )}

        {showGrid && rows.length > 0 && (
          <IndustrialDataGrid rows={rows} columns={WAREHOUSE_FOUNDATION_COLUMNS} onRowSelect={setSelectedRow} selectedRowId={selectedRow?.id} />
        )}

        {showGrid && rows.length > 0 && allRows.length !== rows.length && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
            A mostrar {rows.length} de {allRows.length} armazéns
          </p>
        )}
      </IndustrialModuleLayout>

      <WarehouseCreateModal
        open={ops.createOpen}
        form={ops.form}
        submitting={ops.submitting}
        feedback={ops.feedback}
        onClose={ops.closeCreate}
        onChange={ops.updateField}
        onSubmit={ops.submitCreate}
      />
      <WarehouseEditShell open={ops.editOpen} warehouse={selectedRow} onClose={ops.closeEdit} />
    </div>
  );
}
