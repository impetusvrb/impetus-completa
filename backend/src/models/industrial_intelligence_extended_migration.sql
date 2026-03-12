-- ============================================================================
-- IMPETUS - Extensão Inteligência Industrial
-- Variáveis industriais completas: oil_level, water_flow, alarm_state
-- Compatível com Modbus, OPC UA, APIs industriais
-- ============================================================================

-- plc_collected_data: novas colunas para variáveis operacionais
ALTER TABLE plc_collected_data ADD COLUMN IF NOT EXISTS oil_level NUMERIC(8,2);
ALTER TABLE plc_collected_data ADD COLUMN IF NOT EXISTS water_flow NUMERIC(8,2);
ALTER TABLE plc_collected_data ADD COLUMN IF NOT EXISTS hydraulic_pressure NUMERIC(8,2);
ALTER TABLE plc_collected_data ADD COLUMN IF NOT EXISTS electrical_current NUMERIC(8,2);
ALTER TABLE plc_collected_data ADD COLUMN IF NOT EXISTS motor_temperature NUMERIC(8,2);
ALTER TABLE plc_collected_data ADD COLUMN IF NOT EXISTS vibration_level NUMERIC(8,2);
ALTER TABLE plc_collected_data ADD COLUMN IF NOT EXISTS alarm_state TEXT;
