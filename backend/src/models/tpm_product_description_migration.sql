-- Descrição do produto em incidentes TPM (análise de perdas / relatórios / IA analítica)
ALTER TABLE tpm_incidents ADD COLUMN IF NOT EXISTS product_description TEXT;
