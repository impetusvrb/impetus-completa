/**
 * INC-018 — Mapeamento conservador de priority → tier semântico visual.
 * Fonte: global_whispers[].priority (organizationalPresenceEngine).
 * Apenas `critical` é criticidade operacional explícita; `high` cobre alertas
 * declarados (ex. modo monitoramento). medium/low → normal.
 */
export function whisperSemanticTier(priority) {
  if (priority === 'critical') return 'critical';
  if (priority === 'high') return 'warning';
  return 'normal';
}

export default whisperSemanticTier;
