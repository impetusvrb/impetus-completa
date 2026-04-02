BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'foto_perfil'
  ) THEN
    ALTER TABLE users ADD COLUMN foto_perfil text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status_online'
  ) THEN
    ALTER TABLE users ADD COLUMN status_online boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'ultimo_visto'
  ) THEN
    ALTER TABLE users ADD COLUMN ultimo_visto timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'message_status'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN message_status text NOT NULL DEFAULT 'enviado';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN delivered_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN read_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'deleted_for_everyone_at'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN deleted_for_everyone_at timestamptz;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS chat_message_deleted_for_user (
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

COMMIT;
