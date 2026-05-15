# Semantic Memory Runtime Governance — IMPETUS

**Data:** 13 de maio de 2026  
**Status:** `semantic memory runtime governed`  
**Classificação:** Memória Cognitiva Operacional Crítica

---

## 1. Princípio Central

> Embeddings NÃO são dados auxiliares. São **memória cognitiva operacional crítica**.

A partir desta consolidação, a memória vetorial do Impetus é tratada como infraestrutura cognitiva governada — com as mesmas garantias de integridade, auditabilidade e resiliência das demais camadas críticas do sistema.

---

## 2. Arquitetura Final

```
┌──────────────────────────────────────────────────────────────────┐
│                    IMPETUS VECTOR RUNTIME                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │ Schema Registry  │    │ Capability Checks │                   │
│  │ dimension: 1536  │    │ pgvector ext ✓    │                   │
│  │ model: emb-3-sm  │    │ vector type ✓     │                   │
│  │ index: ivfflat   │    │ index exists ✓    │                   │
│  │ metric: cosine   │    │ dimension match ✓ │                   │
│  └─────────────────┘    └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │ Governed Operations                       │                   │
│  │ ├─ governedSimilaritySearch (query)       │                   │
│  │ ├─ governedInsertEmbedding (write)        │                   │
│  │ ├─ dualReadSimilaritySearch (upgrade)     │                   │
│  │ └─ safeRebuild (batch + checkpoint)       │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │ Observability                             │                   │
│  │ ├─ Event log (ring buffer, 500 entries)   │                   │
│  │ ├─ Metrics (query/insert/rebuild counts)  │                   │
│  │ ├─ Health check (capabilities + alerts)   │                   │
│  │ └─ Rollout state machine                  │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │ Migration Governance                      │                   │
│  │ ├─ Permanent denylist (legacy frozen)     │                   │
│  │ ├─ Vector destructive pattern detection   │                   │
│  │ ├─ Classifier integration (auto-escalate) │                   │
│  │ └─ Safe migration template (5 phases)     │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Vector Schema Registry

| Campo | Valor |
|-------|-------|
| Tabela | `manual_chunks` |
| Coluna | `embedding` |
| Dimensão | 1536 |
| Provider | OpenAI |
| Modelo | `text-embedding-3-small` |
| Tipo de Índice | IVFFLAT |
| Nome do Índice | `idx_manual_chunks_embedding` |
| Métrica | cosine |
| Operador | `<=>` |
| Ops Class | `vector_cosine_ops` |

---

## 4. Política Vetorial — Migrations

### 4.1 Operações PROIBIDAS (bloqueadas pelo runner)

| Operação | Flag | Detecção |
|----------|------|----------|
| `DROP COLUMN embedding` | `VECTOR_DROP_COLUMN` | Regex sobre SQL normalizado (sem comentários) |
| `ALTER COLUMN embedding TYPE` | `VECTOR_ALTER_TYPE` | Idem |
| `TRUNCATE manual_chunks` | `VECTOR_TRUNCATE_CHUNKS` | Idem |
| `DROP TABLE manual_chunks` | `VECTOR_DROP_TABLE` | Idem |
| `DROP EXTENSION vector` | `VECTOR_DROP_EXTENSION` | Idem |

Qualquer migration que contenha estes padrões é **automaticamente escalada para `destructive`** pelo runner, mesmo que o classificador base a considere `safe`.

### 4.2 Denylist Permanente

| Ficheiro | Motivo |
|----------|--------|
| `pgvector_semantic_search_migration.sql` | DROP COLUMN embedding (original) |
| `pgvector_semantic_search_migration.legacy.sql` | Cópia congelada (referência histórica) |

Bloqueados **permanentemente** — mesmo com `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`.

### 4.3 Padrão Additive-Only

Novas evoluções vetoriais devem seguir o **safe migration template** (`migrations/safe_vector_migration_template.sql`):

| Fase | Objetivo | Risco |
|------|----------|-------|
| PREPARE | Criar coluna/índice shadow (ADD COLUMN + CREATE INDEX CONCURRENTLY) | Zero |
| DUAL-WRITE | Runtime escreve em ambas colunas | Zero |
| VALIDATE | Comparar cobertura e qualidade | Zero |
| ROLLOUT | Runtime lê da coluna nova | Reversível |
| CLEANUP | Remover coluna antiga (**MANUAL, SEPARADO**) | Alto — requer DBA |

---

## 5. Rollout Policy

### Estados do Rollout Vetorial

| Estado | Descrição |
|--------|-----------|
| `stable` | Produção normal, coluna primária ativa |
| `dual_write` | Escrevendo em primary + shadow simultaneamente |
| `dual_read` | Lendo de ambas para comparação |
| `shadow` | Novo índice em paralelo sem substituir produção |
| `migrating` | Transição ativa entre colunas |
| `rebuilding` | Rebuild de embeddings em andamento |
| `degraded` | Falha detectada, fallback ativo |

### Transições Permitidas
```
stable → dual_write → dual_read → shadow → migrating → stable
                  ↕                                      ↑
               degraded ──────────────────────────────────┘
                  ↕
              rebuilding → stable
```

---

## 6. Rebuild Policy

### Regras do Safe Rebuild Engine

1. **Nunca rebuild total síncrono** — sempre em batches (default: 50 rows)
2. **Resumable** — checkpoint por `last_processed_id`
3. **Abortável** — via `AbortSignal`, retorna ao estado anterior
4. **Observável** — eventos `VECTOR_REBUILD_BATCH`, `VECTOR_REBUILD_COMPLETE`, `VECTOR_REBUILD_FAILED`
5. **Rate-limited** — pausa configurável entre batches (default: 200ms)
6. **Validação dimensional** — embedding gerado é validado contra `VECTOR_SCHEMA_REGISTRY.dimension`
7. **Rollback real** — se rebuild falhar, coluna primária permanece intacta

### Métricas de Rebuild

| Métrica | Descrição |
|---------|-----------|
| `rebuilds_started` | Total de rebuilds iniciados |
| `rebuilds_completed` | Total concluídos com sucesso |
| `rebuilds_failed` | Total com falha |
| Progresso por batch | `processed / total_rows` |

---

## 7. Dual-Read / Dual-Write

### Dual-Write (durante upgrades de modelo)
O runtime grava embeddings simultaneamente na coluna primária e numa shadow column, permitindo coexistência de dois modelos de embedding.

### Dual-Read (comparação de qualidade)
A função `dualReadSimilaritySearch` executa a mesma query em ambas colunas e calcula **drift** — diferença média de ranking entre os resultados.

| Métrica | Limiar | Ação |
|---------|--------|------|
| Drift ≤ 1.0 | Nominal | Prosseguir rollout |
| Drift 1.0–3.0 | Atenção | Revisar amostragem |
| Drift > 3.0 | Alerta | `VECTOR_DRIFT_HIGH` emitido |

---

## 8. Observabilidade Vetorial

### Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/internal/vector-health` | GET | Health check completo |
| `/api/internal/vector-health/events` | GET | Últimos N eventos |
| `/api/internal/vector-health/metrics` | GET | Métricas brutas |
| `/api/internal/vector-health/capabilities` | GET | Capabilities do BD |
| `/api/internal/vector-health/rebuild` | POST | Iniciar safe rebuild |

### Tipos de Evento

| Evento | Severidade | Contexto |
|--------|-----------|----------|
| `VECTOR_QUERY_SKIP` | Info | Query ignorada (null vector) |
| `VECTOR_QUERY_SLOW` | Warning | Latência > 2s |
| `VECTOR_QUERY_FAILED` | Error | Falha na query SQL |
| `VECTOR_DIMENSION_MISMATCH` | Error | Embedding com dimensão errada |
| `VECTOR_INSERT_FAILED` | Error | Falha no INSERT |
| `VECTOR_HEALTH_DEGRADED` | Critical | Capability check falhou |
| `VECTOR_DRIFT_HIGH` | Warning | Drift > 3.0 entre colunas |
| `VECTOR_REBUILD_START/BATCH/COMPLETE/FAILED/ABORTED` | Info/Error | Ciclo de vida do rebuild |
| `VECTOR_ROLLOUT_STATE_CHANGE` | Info | Mudança de estado |

### Alertas Automáticos

| Condição | Nível |
|----------|-------|
| Extensão pgvector ausente | Critical |
| Tabela manual_chunks ausente | Critical |
| Coluna embedding ausente | Critical |
| Índice de embedding ausente | Warning |
| Dimensão incompatível | Critical |
| >20% chunks sem embedding | Warning |

---

## 9. Dependências Runtime

| Módulo | Ficheiro | Papel Vetorial |
|--------|----------|----------------|
| Contexto Documental | `documentContext.js` | `searchCompanyManuals` — busca semântica |
| Processamento de Manuais | `manuals.js` | `chunkAndEmbedManual` — ingestão |
| IA de Coleta (PLC) | `plcDataService.js` | `getManualsForEquipment` — contexto PLC |
| Diagnóstico | `diagnostic.js` | `searchManuals` → `searchCompanyManuals` |
| Serviço de IA | `ai.js` | `embedText` — geração via OpenAI |
| Upload Admin | `admin/settings.js` | Dispara chunking + embedding |
| Upload Manuais | `routes/manuals.js` | Idem |

### Classificação de Criticidade

| Aspecto | Avaliação |
|---------|-----------|
| Falha de query vetorial | **Degradação** (retorna `[]`, não crash) |
| Falha de INSERT/embedding | **Impacto directo** no upload de manuais |
| Ausência de índice | KNN mais lento, mas funcional |
| `embedText` indisponível (OpenAI down) | **Degradação** (circuit breaker, retorna null) |

---

## 10. Testes e Hardening

### Suite: `test:vector-safety` (48 testes)

| Seção | Testes | Cobertura |
|-------|--------|-----------|
| T1: Denylist permanente | 3 | Bloqueio de legacy migrations |
| T2: Padrões destrutivos vetoriais | 7 | Detecção de DROP/ALTER/TRUNCATE em embeddings |
| T3: Exclusão de *.legacy.sql | 3 | Forward pipeline limpo |
| T4: Marcadores no legacy SQL | 2 | LEGACY + DESTRUCTIVE + DO NOT EXECUTE |
| T5: Schema Registry | 8 | Todos os campos validados |
| T6: Rollout States | 4 | Transições e rejeição de estados inválidos |
| T7: Validação dimensional | 2 | Rejeição de dimensão errada e null |
| T8: Governed search null | 1 | Retorno gracioso para null vector |
| T9: Dual-read sem shadow | 2 | Sem shadow = primary only |
| T10: Safe rebuild validation | 1 | Requer embedFn |
| T11: Event log | 2 | Eventos emitidos e consultáveis |
| T12: Métricas | 5 | Contadores incrementados |
| T13: Scan de forward | 1 | Zero padrões destrutivos em 83 migrations |
| T14: Template seguro | 2 | Classificado safe, sem destrutivos |
| T15: Exportações | 2 | API pública completa |

### Regressão Global Verificada

| Suite | Testes | Status |
|-------|--------|--------|
| `test:vector-safety` | 48 | ✅ 0 falhas |
| `test:dashboard-governance` | 74 | ✅ 0 falhas |
| `test:contextual-domain-isolation` | 22 | ✅ 0 falhas |
| `migrate:test` | T01-T11 | ✅ TESTS_PASSED |

---

## 11. Runtime Guarantees

| Garantia | Mecanismo |
|----------|-----------|
| Zero migrations destrutivas futuras | Denylist + vector destructive patterns + classifier auto-escalation |
| Embeddings preservados | Additive-only migrations + rebuild seguro |
| Semantic runtime estável | Capability checks + fallback gracioso |
| Rollback real | Shadow column + state machine + abort signal |
| Evolução vetorial segura | 5-phase template + dual-write + dual-read |
| Observabilidade | Event log + metrics + health endpoint + alertas |
| Proteção permanente | 48 testes + scan automático de todas as migrations forward |

---

## 12. Arquivos Criados / Modificados

### Novos
| Arquivo | Propósito |
|---------|-----------|
| `backend/src/services/vectorRuntimeService.js` | Camada de governança da memória vetorial |
| `backend/src/routes/internal/vectorHealth.js` | Endpoints de observabilidade |
| `backend/migrations/safe_vector_migration_template.sql` | Template para evoluções vetoriais |
| `backend/src/tests/vectorMigrationSafetyScenarios.js` | 48 testes de governança vetorial |
| `backend/docs/SEMANTIC_MEMORY_RUNTIME_GOVERNANCE.md` | Este documento |

### Modificados
| Arquivo | Alteração |
|---------|-----------|
| `backend/scripts/migrations/migrationSafetyPolicy.js` | `VECTOR_DESTRUCTIVE_PATTERNS` + `detectVectorDestructivePatterns` |
| `backend/scripts/run-all-migrations.js` | Integração do vector destructive check no planner |
| `backend/src/server.js` | Rota `/api/internal/vector-health` |
| `backend/package.json` | Script `test:vector-safety` |

### NÃO Modificados (preservação total)
| Arquivo | Razão |
|---------|-------|
| `backend/src/services/documentContext.js` | Query vetorial existente funcional — governança é aditiva |
| `backend/src/services/manuals.js` | Ingestão funcional — governança é aditiva |
| `backend/src/services/plcDataService.js` | Query vetorial funcional — governança é aditiva |
| `backend/src/services/ai.js` | `embedText` funcional — governança é aditiva |
| `backend/src/services/liveDashboardService.js` | Sem alteração (fora do escopo) |
| `backend/src/services/dashboardAccessService.js` | Sem alteração (fora do escopo) |

---

## 13. Veredito

```
semantic memory runtime governed
```

O problema deixou de ser "uma migration perigosa" e passou a existir uma **arquitetura vetorial governada** — com schema registry explícito, capability checks, dual-read/write para upgrades seguros, rebuild engine com checkpoint, observabilidade completa e proteção permanente contra migrations destrutivas.

> A memória vetorial do Impetus é agora uma infraestrutura cognitiva governada, observável, resiliente e evolutiva — compatível com um runtime operacional onde semantic retrieval integra o núcleo da cognição da plataforma.
