-- IMPETUS — Rollback da tabela tenant_admins (governança Fase 1)
-- Executar apenas se necessário reverter a camada; não apaga dados em users/companies.
DROP TABLE IF EXISTS tenant_admins;
