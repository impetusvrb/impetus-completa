-- ============================================================================
-- PLANOS E LIMITE DE INSTÂNCIAS WHATSAPP
-- Estrutura para controle de limite por empresa
-- ============================================================================

-- Tabela de planos
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  max_whatsapp_instances INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed planos padrão (compatíveis com plan_type existente)
INSERT INTO plans (name, max_whatsapp_instances, price) VALUES
  ('essencial', 1, 199),
  ('profissional', 1, 399),
  ('estratégico', 2, 799),
  ('enterprise', 5, 1499)
ON CONFLICT (name) DO UPDATE SET
  max_whatsapp_instances = EXCLUDED.max_whatsapp_instances,
  price = EXCLUDED.price,
  updated_at = now();

-- Companies: plan_id e custom_whatsapp_limit
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_whatsapp_limit INTEGER;
COMMENT ON COLUMN companies.custom_whatsapp_limit IS 'Limite customizado (sobrescreve plano). NULL = usar plano';
COMMENT ON COLUMN companies.plan_id IS 'FK para plans. Se NULL, usa plan_type para lookup';

UPDATE companies c SET plan_id = p.id
FROM plans p
WHERE c.plan_type = p.name AND c.plan_id IS NULL;

-- Tabela de instâncias WhatsApp (contagem e auditoria)
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),
  instance_token TEXT,
  client_token TEXT,
  api_url TEXT DEFAULT 'https://api.z-api.io',
  business_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_instances_company_instance ON whatsapp_instances(company_id, instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company ON whatsapp_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance ON whatsapp_instances(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);

-- Migrar instâncias existentes de zapi_configurations para whatsapp_instances
INSERT INTO whatsapp_instances (company_id, instance_id, token, webhook_url, status, instance_token, client_token, api_url, business_phone)
SELECT company_id, instance_id, instance_token, webhook_url, COALESCE(connection_status, 'pending'), instance_token, client_token, api_url, business_phone
FROM zapi_configurations
WHERE instance_id IS NOT NULL AND instance_id != ''
ON CONFLICT (company_id, instance_id) DO NOTHING;
