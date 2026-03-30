-- ManuIA inbox: estado de atendimento (aditivo, sem reset de dados)
ALTER TABLE manuia_inbox_notifications
  ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'open';

COMMENT ON COLUMN manuia_inbox_notifications.attendance_status IS
  'open | in_progress | resolved | escalated — fluxo técnico em campo';
