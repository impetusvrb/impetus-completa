/**
 * Hook para registrar atividades do usuário
 * Usado pelo Resumo Inteligente Diário
 */
import { useCallback } from 'react';
import { dashboard } from '../services/api';

export function useActivityLog() {
  const log = useCallback((activityType, entityType, entityId, context = {}) => {
    dashboard.logActivity({
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      context
    }).catch(() => {});
  }, []);

  return { log };
}
