/**
 * Estados de widget conforme spec v3: loading (skeleton), empty, error, stale, no_permission, first_load.
 * Renderiza o conteúdo apenas quando state === 'ready'.
 */
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import WidgetSkeleton from './WidgetSkeleton';

export const WIDGET_STATES = {
  loading: 'loading',
  empty: 'empty',
  error: 'error',
  stale: 'stale',
  no_permission: 'no_permission',
  first_load: 'first_load',
  ready: 'ready'
};

export function WidgetState({
  state,
  onRetry,
  emptyMessage = 'Nenhum dado para este período.',
  emptyAction,
  errorMessage = 'Não foi possível carregar os dados.',
  skeletonLines = 3,
  skeletonKpiGrid = false,
  staleMessage = 'Dados podem estar desatualizados.',
  firstLoadMessage = 'Personalizando...',
  children
}) {
  if (state === WIDGET_STATES.loading || state === WIDGET_STATES.first_load) {
    return (
      <div className="dashboard-widget-wrapper">
        {(state === WIDGET_STATES.first_load && firstLoadMessage) && (
          <p className="dashboard-widget__first-load-badge">{firstLoadMessage}</p>
        )}
        <WidgetSkeleton lines={skeletonLines} showKpiGrid={skeletonKpiGrid} />
      </div>
    );
  }

  if (state === WIDGET_STATES.no_permission) {
    return null; // Widget oculto completamente — nunca exibir "Acesso negado"
  }

  if (state === WIDGET_STATES.error) {
    return (
      <div className="dashboard-widget dashboard-widget--error">
        <div className="dashboard-widget__header">
          <h3 className="dashboard-widget__title"><AlertCircle size={20} /> Erro</h3>
        </div>
        <p className="dashboard-widget__empty">{errorMessage}</p>
        {onRetry && (
          <button type="button" className="dashboard-widget__action btn-retry" onClick={onRetry}>
            <RefreshCw size={16} /> Tentar novamente
          </button>
        )}
      </div>
    );
  }

  if (state === WIDGET_STATES.empty) {
    return (
      <div className="dashboard-widget dashboard-widget--empty">
        {children && typeof children === 'function' ? children('empty') : (
          <>
            <p className="dashboard-widget__empty">{emptyMessage}</p>
            {emptyAction}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-widget-wrapper">
      {state === WIDGET_STATES.stale && staleMessage && (
        <div className="dashboard-widget__stale-banner" role="status">
          {staleMessage}
        </div>
      )}
      {children && typeof children === 'function' ? children('ready') : children}
    </div>
  );
}
