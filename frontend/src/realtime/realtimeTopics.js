/**
 * WAVE 6 — Topics declarativos do canal realtime unificado.
 */

export const REALTIME_TOPIC = Object.freeze({
  /** Mensagens e eventos de chat (socket.io legado: 'new_message', etc.) */
  CHAT: 'chat',
  /** Eventos operacionais (alerts, kpis, status live) */
  OPERATIONAL: 'operational',
  /** Progresso de workflows (WAVE 5 backend) */
  WORKFLOW: 'workflow',
  /** Alertas críticos de sistema / DLQ */
  ALERTS: 'alerts',
  /** Presença de utilizadores online */
  PRESENCE: 'presence',
  /** Colecta qualidade industrial / inspecções (dual-runtime operational layer) */
  QUALITY_OPERATIONS: 'quality_operations'
});

/** Eventos socket.io do legado mapeados para topic. */
export const SOCKET_EVENT_TO_TOPIC = Object.freeze({
  new_message: REALTIME_TOPIC.CHAT,
  user_typing: REALTIME_TOPIC.CHAT,
  user_stop_typing: REALTIME_TOPIC.CHAT,
  messages_read: REALTIME_TOPIC.CHAT,
  message_reaction: REALTIME_TOPIC.CHAT,
  message_deleted: REALTIME_TOPIC.CHAT,
  user_online: REALTIME_TOPIC.PRESENCE,
  user_offline: REALTIME_TOPIC.PRESENCE,
  user_profile_updated: REALTIME_TOPIC.PRESENCE,
  impetus_alert: REALTIME_TOPIC.ALERTS,
  workflow_update: REALTIME_TOPIC.WORKFLOW,
  kpi_update: REALTIME_TOPIC.OPERATIONAL,
  operational_event: REALTIME_TOPIC.OPERATIONAL,
  quality_operational_update: REALTIME_TOPIC.QUALITY_OPERATIONS,
  quality_inspection_delta: REALTIME_TOPIC.QUALITY_OPERATIONS
});
