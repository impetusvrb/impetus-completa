-- ============================================================================
-- IMPETUS - Watchers e lembretes de tarefas (equipe envolvida)
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task
  ON task_watchers(task_id);

CREATE INDEX IF NOT EXISTS idx_task_watchers_user
  ON task_watchers(user_id);

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'team',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_pending
  ON task_reminders(remind_at, sent_at)
  WHERE sent_at IS NULL;
