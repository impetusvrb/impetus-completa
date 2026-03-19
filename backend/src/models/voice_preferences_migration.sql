-- Preferências de voz por usuário (chat Impetus)
CREATE TABLE IF NOT EXISTS voice_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alerts_enabled BOOLEAN DEFAULT true,
  alert_min_priority VARCHAR(2) DEFAULT 'P2',
  auto_speak_responses BOOLEAN DEFAULT true,
  voice_id VARCHAR(50) DEFAULT 'onyx',
  speed DECIMAL(3,1) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_voice_preferences_user ON voice_preferences(user_id);
