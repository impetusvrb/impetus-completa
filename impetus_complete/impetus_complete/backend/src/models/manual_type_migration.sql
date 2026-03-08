-- Migration: Separar Manual Operacional de Manual de Máquina
-- manual_type: 'operacional' = procedimentos/processos, 'maquina' = equipamento específico
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS manual_type TEXT DEFAULT 'maquina';
-- Garantir valores válidos para registros existentes
UPDATE manuals SET manual_type = 'maquina' WHERE manual_type IS NULL OR manual_type NOT IN ('operacional', 'maquina');
