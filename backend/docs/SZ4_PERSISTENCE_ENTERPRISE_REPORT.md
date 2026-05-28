# SZ4 Persistence — Relatório Enterprise (PROMPT 15)

**Data:** 2026-05-27  
**Débito:** D6 (`TECHNICAL_DEBT_MASTER_REPORT.md`)  
**Roadmap:** T1.14 (`FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md`)  
**Estado:** `IMPETUS_SZ4_PERSISTENCE=on` · piloto único · replay no boot

---

## 1. Objetivo

Eliminar perda de sinais operacionais SZ4 (threads, workflows, tasks, reminders, eventos de awareness) após reboot do processo Node/PM2, sem alterar UX, Motor A, Engine V2 ou comportamento assistive-only.

---

## 2. Impacto e princípios validados

| Princípio | Conformidade |
|-----------|--------------|
| Additive-only | Novo módulo `persistence/`; store in-memory preservado |
| Shadow-first / pilot | Só tenants em `IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS` |
| Rollback instantâneo | `IMPETUS_SZ4_PERSISTENCE=off` + PM2 `--update-env` |
| Tenant isolation | `tenant_id` em todas as queries; gate por piloto |
| LGPD | Payload = dados já observados pelo SZ4 (excerpts ≤280); TTL 90d |
| Auditabilidade | `audit_logs` action `sz4_persistence_boot` |
| Observabilidade | APM `recordGovernanceEvent` opcional; métricas em diagnostics |
| Backward compatibility | Tenants não-piloto: RAM-only (comportamento anterior) |
| Baixo overhead | `setImmediate` — escrita assíncrona pós-pipeline |

---

## 3. Flags envolvidas

| Flag | Valor pilot |
|------|-------------|
| `IMPETUS_SZ4_PERSISTENCE` | `on` |
| `IMPETUS_SZ4_PERSISTENCE_PILOT_ONLY` | `true` |
| `IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS` | `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` (1 tenant) |
| `IMPETUS_SZ4_PERSISTENCE_TTL_DAYS` | `90` |
| `IMPETUS_SZ4_PERSISTENCE_REPLAY_ON_BOOT` | `true` |
| `IMPETUS_SZ4_PERSISTENCE_MAX_REPLAY_PER_TENANT` | `500` |

**Rollback:**

```bash
IMPETUS_SZ4_PERSISTENCE=off
pm2 restart impetus-backend --update-env
```

---

## 4. Dependências

- PostgreSQL (`db`)
- `uuid`
- Tabela `audit_logs` (boot audit)
- `sz4PipelineCore` (hook pós-resultado)
- `sz4TenantStore` (hydrate no replay)
- Opcional: `apmEnterpriseBridge` (governance events)

---

## 5. Rotas afetadas

| Método | Rota | Alteração |
|--------|------|-----------|
| GET | `/api/runtime-z-operational-nervous-system/health` | Bloco `persistence` |
| GET | `/api/runtime-z-operational-nervous-system/persistence/health` | **Nova** (RBAC: requireAuth) |
| GET | `/api/admin/runtime/sz4-persistence` | **Nova** (admin) |
| POST | `/api/admin/runtime/sz4-persistence/bootstrap-schema` | **Nova** |
| POST | `/api/admin/runtime/sz4-persistence/purge-expired` | **Nova** |

**Hot paths (read-only após resposta):**

- `sz4PipelineCore.processOperationalSignal` → `persistPipelineOutcome` (async)
- `server.js` boot → `warmRecoveryOnBoot` + `purgeExpired`

**Sem alteração:** dashboard composition, chat response body, Motor A, Engine V2.

---

## 6. Serviços / artefactos

| Artefacto | Função |
|-----------|--------|
| `persistence/sz4PersistenceRuntime.js` | Runtime TTL, replay, purge, audit |
| `models/sz4_operational_persistence_migration.sql` | Schema |
| `scripts/verify-sz4-persistence-evidence.js` | Evidência |
| `scripts/apply-sz4-persistence-pilot.js` | Deploy controlado |

---

## 7. Schema

Tabela `sz4_operational_persistence_records`:

- `record_kind`: `event` | `thread` | `workflow` | `task` | `reminder`
- `expires_at`: TTL (90 dias default)
- UPSERT para estado; INSERT append-only para eventos

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Pressão DB | Piloto 1 tenant; writes async |
| PII em JSONB | Mesmo limite de excerpt SZ4; TTL + purge |
| Replay lento no boot | Cap 500 registos/tenant/kind |
| ON CONFLICT / índice parcial | Eventos com INSERT separado |
| Regressão pipeline | try/catch — nunca bloqueia retorno |

---

## 9. Verificação

```bash
cd /var/www/impetus-completa/backend
node scripts/verify-sz4-persistence-evidence.js
# ou:
node scripts/apply-sz4-persistence-pilot.js
```

Log esperado: `[SZ4_PERSISTENCE_BOOT]` com `recovery.ok`, `schema_ok: true`.

---

## 10. Próximos passos (fora PROMPT 15)

| Prompt | Escopo |
|--------|--------|
| 16 | SSO/OIDC/SAML/SCIM |
| 17 | MFA universal |
| 18 | RLS multi-tenant hardening |
| 19–23 | Telemetria industrial real |
| 24–25 | Action runtime + BPMN |
| 26–28 | Consolidação cognitiva |
| 29–32 | Rollout center, i18n, certificação, auditoria final |

**Expansão SZ4 persistence:** após 7d estáveis no piloto, acrescentar UUIDs a `IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS` (não remover flag global).

---

*Relatório gerado no âmbito da sequência oficial T2 — IMPETUS Comunica IA.*
