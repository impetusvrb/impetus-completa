-- CERT Parte 7.2 / SST industrial — expande tipos permitidos em operational_alerts
-- Substitui CHECK legado (6 tipos fixos) por lista + prefixos SST e motor de decisões.

ALTER TABLE operational_alerts DROP CONSTRAINT IF EXISTS operational_alerts_tipo_alerta_check;

ALTER TABLE operational_alerts ADD CONSTRAINT operational_alerts_tipo_alerta_check
  CHECK (
    tipo_alerta = ANY (ARRAY[
      'maquina_parada',
      'falha_recorrente',
      'tarefa_atrasada',
      'problema_nao_resolvido',
      'consumo_anormal',
      'parada_linha',
      'plano_operacional',
      'sst_incident_created',
      'sst_incident_critical',
      'sst_near_miss',
      'sst_accident_reported',
      'sst_training_expired',
      'sst_training_due',
      'sst_audit_due',
      'sst_audit_overdue',
      'sst_non_compliance',
      'sst_emergency_event'
    ]::text[])
    OR tipo_alerta LIKE 'operational_decision:%'
    OR tipo_alerta LIKE 'sst_%'
  );

COMMENT ON CONSTRAINT operational_alerts_tipo_alerta_check ON operational_alerts IS
  'Tipos operacionais legados + lifecycle SST (Parte 7.2) + motor de decisões';
