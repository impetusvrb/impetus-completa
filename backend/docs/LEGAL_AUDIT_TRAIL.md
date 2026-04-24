# Trilha legal (`ai_legal_audit_logs`)

## Comportamento

- **Inserção:** eventos são gravados com `INSERT` (serviço de auditoria legal).
- **Retenção:** o job de ciclo de vida (`dataLifecycleService`) **não apaga** linhas desta tabela. Registos com `created_at` anterior ao período configurado (`DATA_RETENTION_AUDIT_LOG_DAYS` / política) são marcados com `archived = true` e `archived_at = now()`.
- **Anonimização:** quando aplicável noutros fluxos, campos podem ser tratados conforme política; a linha de auditoria permanece como evidência, salvo evolução explícita de modelo de dados.

## Relatórios e dashboards

Agregações operacionais (relatórios de conformidade, overview 30d/90d) filtram **`archived IS NOT TRUE`** para refletir atividade “ativa”. Os registos arquivados permanecem na base para auditoria forense ou exportações dedicadas.

## Migração

Executar `backend/src/models/ai_legal_audit_logs_archive_migration.sql` (incluída no conjunto de ficheiros `.sql` sob `src/models/`).

## Alinhamento normativo (resumo)

- **LGPD:** redução de dados operacionais (arquivo lógico) sem destruir evidência de tratamento e decisões de conformidade quando ainda necessárias à demonstração de boa-fé e responsabilização.
- **ISO/IEC 42001:** controlo de registos e integridade da evidência do sistema de gestão de IA; operações sobre a trilha devem ser traçáveis; o padrão aqui é **append-only com atualização restrita** a arquivamento (e anonimização controlada noutros módulos), nunca eliminação silenciosa de eventos.
