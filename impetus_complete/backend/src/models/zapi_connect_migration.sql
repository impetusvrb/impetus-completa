-- Z-API CONNECT - Integração automática (Conectar WhatsApp)
-- Campos para fluxo de conexão via QR Code

ALTER TABLE zapi_configurations ALTER COLUMN business_phone DROP NOT NULL;

ALTER TABLE zapi_configurations ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'pending';
