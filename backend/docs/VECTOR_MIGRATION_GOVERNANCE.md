# Vector Migration Governance — Política Formal

**Documento oficial de governança de migrations vetoriais do IMPETUS.**

---

## Destructive Migrations Policy

### Operações proibidas em migrations automáticas

1. `DROP COLUMN embedding` — **NUNCA** em pipeline automático
2. `ALTER COLUMN embedding TYPE` — mudança dimensional requer 5-phase migration
3. `TRUNCATE manual_chunks` — destruição total da memória cognitiva
4. `DROP TABLE manual_chunks` — destruição irreversível
5. `DROP EXTENSION vector` — desativação do runtime pgvector

### Detecção automática
O runner detecta estes padrões via `detectVectorDestructivePatterns` sobre SQL normalizado (sem comentários). Qualquer match auto-escala a migration para `destructive`.

---

## Additive-Only Guideline

Toda evolução vetorial deve:
- ✅ **ADD COLUMN** (shadow column com novo tipo/dimensão)
- ✅ **CREATE INDEX CONCURRENTLY** (sem bloquear leituras)
- ✅ Usar o runtime para dual-write (ambas colunas)
- ✅ Validar cobertura e qualidade antes de rollout
- ❌ **NUNCA** `DROP COLUMN` em pipeline automático
- ❌ **NUNCA** `ALTER TYPE` sem shadow column prévia

---

## Rebuild Policy

1. Reconstruções de embeddings devem usar `vectorRuntimeService.safeRebuild`
2. Sempre em batches com checkpoint (nunca rebuild total síncrono)
3. Sempre abortável via `AbortSignal`
4. Sempre com validação dimensional
5. Rate-limited (200ms entre batches por padrão)

---

## Rollback Policy

| Cenário | Ação |
|---------|------|
| Rebuild falha a meio | Estado preservado. Retry a partir do último checkpoint. |
| Novo modelo de embedding pior | Reverter `VECTOR_SCHEMA_REGISTRY.primary.column` para coluna original. |
| Shadow column corrompida | Dropar shadow column manualmente. Primary intacta. |
| pgvector extension removida | Alerta `VECTOR_HEALTH_DEGRADED`. Queries degradam para `[]`. |

---

## Vector Governance Rules

1. **Embeddings são memória cognitiva crítica** — tratamento equivalente a dados financeiros.
2. **Toda migration que toque colunas de embedding** passa por revisão humana.
3. **O runner classifica automaticamente** qualquer migration com padrões vetoriais.
4. **Cleanup de colunas shadow** é operação **manual**, **separada**, **nunca automática**.
5. **Testes `test:vector-safety`** devem passar antes de qualquer deploy.
6. **O template oficial** (`safe_vector_migration_template.sql`) é o padrão para novas evoluções.
