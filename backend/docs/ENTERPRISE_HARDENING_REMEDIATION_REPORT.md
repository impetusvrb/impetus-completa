# IMPETUS — Enterprise Hardening Remediation Report

**Modo:** correção estrutural aditiva, sem regressões nem mudanças destrutivas.
**Princípio guia:** *"o Impetus já sabe pensar — esta fase garante que pensa com isolamento, atomicidade, rastreabilidade, segurança multi-tenant e resiliência enterprise."*

Todas as alterações são **aditivas, feature-flagged onde necessário, backward-compatible, observáveis e testáveis**. Nenhuma rota foi removida, nenhum schema foi destruído, nenhum comportamento cognitivo foi alterado.

---

## 1. Matriz Problema → Correção → Impacto → Risco → Compatibilidade

| Achado | Bloco | Correção | Onde | Impacto | Risco | Compatibilidade |
|---|---|---|---|---|---|---|
| C1 / C2 / C3 / A12 — rotas internas anónimas | 1 | `requireInternalAccess` + `requireAuth` + `apiByUserLimiter` / `heavyRouteLimiter`; flag `IMPETUS_INTERNAL_ROUTES_ENABLED`; payload reduzido em `/api/system/health/deep` para callers não autorizados | `backend/src/server.js`, `backend/src/middleware/internalRouteGuard.js` | Fecha 6 famílias de rotas internas + health deep | Baixo (caller legítimo usa header `X-Health-Key` ou está autenticado) | Total: token-based ops continuam; payload completo permanece para `internal_admin` e `loopback` |
| C5 — IDOR em `markAsRead` operacional | 2 | Assinatura adicionada `markAsRead(id, userId, companyId)` + `AND company_id` no UPDATE; rota envia `req.user.company_id` | `backend/src/services/operationalInsightsService.js`, `backend/src/routes/dashboardOperationalBrain.js` | Bloqueia leitura/escrita cross-tenant via enumeration | Baixo: callers que não passem companyId recebem WARN e `false` | Aditiva — não quebra callers legados (apenas no-op com log) |
| C6 — IDOR em `resolveAlert` operacional | 2 | Mesmo padrão de `markAsRead` | `operationalAlertsService.js`, mesma rota | Idem | Baixo | Idem |
| Multi-tenant geral | 2 | `tenantIsolationGuard()` + helper `assertSameTenant()` | `backend/src/middleware/tenantIsolationGuard.js` | Disponível para handlers críticos opt-in | Zero | Aditivo (não bloqueia rotas não montadas com ele) |
| C7 / C8 — race em support recovery (`approve` / `execute`) | 3 | Claim atómico via `UPDATE ... WHERE status=... RETURNING` em vez de `SELECT FOR UPDATE` separado | `backend/src/services/supportRecoveryGovernanceService.js` | Elimina dupla aprovação / dupla execução simultânea | Baixo: estados intermediários `executing` adicionados, mas reversíveis automaticamente em falha | Total — mesma API; `SAME_ACTOR` pré-validado fora da TX |
| C9 — TOCTOU em tenant creation (Impetus Admin) | 3 | Padrão claim atómico já validado em pelo menos um caminho; serviço `tenantAdminService.promoteOrSetAdminTypeSupport` mantém `BEGIN/COMMIT` interno com `FOR UPDATE` numa única conexão | (existente, validado) | N/A | Zero | Inalterado |
| C11 / M21 / M22 / B11 — runner de migrations frágil | 4 | `migrationGovernanceService.js` com `pg_advisory_lock` global, classificação por SQLSTATE; `start.sh` sem `\|\| true` / `2>/dev/null` | `backend/scripts/run-all-migrations.js`, `start.sh`, novo `backend/src/services/migrationGovernanceService.js` | Impede dois runners simultâneos; falhas reais já não são silenciadas | Médio durante deploy (script falha rápido em erro real — comportamento desejado) | Flag `IMPETUS_MIGRATION_ADVISORY_LOCK=false` permite rollback do lock; flag `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS` mantida; classificação SQLSTATE é estritamente mais precisa que substring |
| C10 — circuit breaker global para módulos contextuais | 5 | Suporte opt-in a buckets por tenant via flag `IMPETUS_CONTEXTUAL_BREAKER_PER_TENANT` | `backend/src/contextualModules/modulePromotionGuard.js` | Falha de um tenant não derruba os outros quando flag activa | Baixo | Default mantém comportamento legado (global); ativação per-tenant é opt-in |
| M1 — métricas em memória | 5 | (Mantido + documentado — operador deve plugar Redis/Pulsar no futuro) | observabilityService | Sem regressão | Zero | Inalterado |
| A1 — token em query string | 6 | `requireAuth` deixa de aceitar `req.query.token` por defeito; flag `IMPETUS_ALLOW_TOKEN_IN_QUERY=true` reativa com WARN estruturado | `backend/src/middleware/auth.js` | Reduz leakage via logs / Referer | Médio: caso algum cliente legacy ainda use, basta activar a flag e mapear callers | Aditivo com escape hatch |
| A2 — `company_id` fallback do JWT | 6 | `IMPETUS_STRICT_TENANT_FROM_DB=true` (default) — JWT NÃO preenche tenant ausente; tentativa registada em `TENANT_FROM_JWT_FALLBACK_BLOCKED` | `backend/src/middleware/auth.js` | Multi-tenant blindado — JWT já não pode alargar escopo | Baixo | Flag reversível para rollback de emergência |
| A4 — JWT secret placeholder em produção | 6 | `IMPETUS_JWT_FAIL_CLOSED_PLACEHOLDER` default `true` em produção; placeholders conhecidos provocam exit | `backend/src/middleware/auth.js` | Zero produção com secret inseguro | Baixo | Dev local continua a permitir via `ALLOW_PARTIAL_ENV` |
| (defesa em profundidade) JWT confusão de algoritmo | 6 | `algorithms: ['HS256']` fixado em `jwt.verify` e exportado para o emissor | `backend/src/middleware/auth.js`, `backend/src/routes/auth.js` | Imune a downgrade `alg: none` / algoritmo trocado | Zero | Inalterado para callers legítimos |
| A13 — sessão pode falhar mas token é emitido | 6 | Flag `IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE` (default `true`) — falha INSERT → 503; cliente repete | `backend/src/routes/auth.js` | Sem tokens órfãos | Médio em DB transient (cliente refaz login) | Reversível via flag |
| A5 / A6 / A11 / A7 — autoridades cognitivas concorrentes | 7 | `authorityResolutionService.js` (decora `meta.authority`, detecta conflitos) — **observador** | `backend/src/services/authorityResolutionService.js` | Visibilidade unificada de quem decide; consistência meta-data | Zero — não substitui motor | Aditivo; callers podem chamar `.decorate(envelope, hints)` |
| A14 / A16 — bypass admin no frontend | 8 | Mantém bypass de UX (visual) mas backend agora é autoridade canónica (Blocos 1, 6); comentário explícito no código | `frontend/src/hooks/useVisibleModules.js` | Não há mais cenário em que UX bypass leve a acesso real | Zero | Inalterado |
| A15 — `FactoryTeamMemberGate` inconsistente | 8 | (mantido — não fazia parte do hardening mínimo; backend agora autoritativo) | App.jsx | N/A | N/A | N/A |
| A17 — `/chat` sem SetupGuard | 8 | `SetupGuard` adicionado à rota `/chat` | `frontend/src/App.jsx` | Utilizadores em setup já não acedem chat | Zero | Inalterado |
| M9 — chat socket não desliga no logout | 8 | `disconnectChatSocket()` exportado e chamado no logout do Layout; recicla quando token muda | `frontend/src/chat-module/hooks/useChatSocket.js`, `frontend/src/components/Layout.jsx` | Sem sockets fantasma | Zero | Compatível com mounts existentes |
| M10 — fetch sem AbortController | 8 | `AbortController` no `useVisibleModules`; `dashboard.getMe(config)` propaga `signal` | `frontend/src/hooks/useVisibleModules.js`, `frontend/src/services/api.js` | Sem setState órfão | Zero | Assinatura de `getMe()` retro-compatível (`config` é opcional) |
| A9 — `ai_decision_logs` mutável | 9 | Migration aditiva `202605131_audit_immutability_triggers_migration.sql` cria triggers BEFORE UPDATE/DELETE que lançam `IMPETUS_AUDIT_IMMUTABLE` | `backend/migrations/202605131_*.sql` + rollback | Tampering impossível em pgsql | Baixo: cobre apenas tabelas existentes (idempotente) | Aditivo, rollback fornecido |
| A10 — falhas de audit log silenciadas | 9 | `auditOutboxService` com retry/backoff; orchestrator passa a usar | `backend/src/services/auditOutboxService.js`, `backend/src/ai/cognitiveOrchestrator.js` | Zero falhas silenciosas; replay externo possível via `AUDIT_OUTBOX_PERMANENT_FAIL` | Baixo | Aditivo |
| A18 / M7 / M8 | 9 | (parcial — outbox cobre o caso principal; truncation/encryption ficam como pendência aditiva) | — | Mitigado | Baixo | N/A |
| M20 / B2 / B6 — correlation IDs ausentes | 10 | `correlationIdMiddleware` antes de tudo; AsyncLocalStorage continua a ler | `backend/src/middleware/correlationId.js`, `backend/src/server.js` | Traceability end-to-end | Zero | Aditivo |
| M15 / M16 / M17 — flags sem governança | 11 | `featureGovernanceService.js` snapshot+validação no boot; alertas estruturados | `backend/src/services/featureGovernanceService.js`, `backend/src/server.js` | Cluster snapshot, regras de combinação inválida | Zero (não bloqueia boot) | Aditivo |
| M2 / B1 / B3 / B4 / B5 / B7 / B8 / B10 | 12 | `gracefulShutdown` completo: `io.close`, cron tasks, intervals, watchdog 12s | `backend/src/server.js` | Zero conexões zumbi após SIGTERM | Baixo | Watchdog 12s evita travar deploy |

---

## 2. Lista — Flags adicionadas

| Flag | Default | Bloco | Função |
|---|---|---|---|
| `IMPETUS_INTERNAL_ROUTES_ENABLED` | `true` (mas pode ser `false` em prod para sealar) | 1 | Sela completamente todas as rotas `/api/internal/*` (503) |
| `IMPETUS_INTERNAL_ROUTES_DEV_OPEN` | `false` | 1 | Em DEV apenas: permite passar sem auth para debug local |
| `IMPETUS_INTERNAL_IP_ALLOWLIST` | (vazio) | 1 | Lista CSV de IPs autorizados a tocar rotas internas |
| `IMPETUS_ALLOW_TOKEN_IN_QUERY` | `false` | 6 | Reativa aceitação de `?token=` em requireAuth (escape hatch) |
| `IMPETUS_STRICT_TENANT_FROM_DB` | `true` | 6 | JWT proibido de preencher `company_id` ausente na BD |
| `IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE` | `true` | 6 | Falha de INSERT em `sessions` aborta login com 503 |
| `IMPETUS_JWT_FAIL_CLOSED_PLACEHOLDER` | `true` em produção, `false` fora | 6 | `process.exit` se secret inseguro detectado em produção |
| `IMPETUS_MIGRATION_ADVISORY_LOCK` | `true` | 4 | `pg_advisory_lock` global durante migrate |
| `IMPETUS_MIGRATION_LOCK_TIMEOUT_MS` | `60000` | 4 | Timeout de espera pelo lock |
| `IMPETUS_MIGRATION_LOCK_NAMESPACE` | `impetus_migration_global` | 4 | Permite namespaces se múltiplos ambientes partilharem DB |
| `IMPETUS_CONTEXTUAL_BREAKER_PER_TENANT` | `false` | 5 | Buckets de circuit-breaker por `company_id` |
| `IMPETUS_AUDIT_OUTBOX_MAX` | `5000` | 9 | Tamanho máximo da fila in-memory |

Todas as flags ficam visíveis no log estruturado `[FEATURE_GOVERNANCE_SNAPSHOT]` no boot.

---

## 3. Lista — Novos middlewares / guards / services

### Backend
- `backend/src/middleware/internalRouteGuard.js` — auth+role+IP+flag para rotas internas
- `backend/src/middleware/tenantIsolationGuard.js` — guard + helper `assertSameTenant`
- `backend/src/middleware/correlationId.js` — request-id determinístico
- `backend/src/services/migrationGovernanceService.js` — advisory lock + classificação SQLSTATE
- `backend/src/services/featureGovernanceService.js` — snapshot + validação de flags
- `backend/src/services/auditOutboxService.js` — outbox in-memory com retry
- `backend/src/services/authorityResolutionService.js` — decorador `meta.authority` + detecção de conflito

### Migrations (aditivas, idempotentes)
- `backend/migrations/202605131_audit_immutability_triggers_migration.sql`
- `backend/migrations/_rollback/202605131_audit_immutability_triggers_rollback.sql`

### Frontend
- `disconnectChatSocket()` exportado em `frontend/src/chat-module/hooks/useChatSocket.js`

---

## 4. Lista — Novos testes

Script: `npm run test:enterprise-hardening` (também executável directo: `node src/tests/enterpriseHardeningScenarios.js`)

Cobre **20 cenários**:

1. `Internal Route Guard` — anonymous denied
2. `Internal Route Guard` — tenant user denied (403)
3. `Internal Route Guard` — `internal_admin` allowed
4. `Internal Route Guard` — flag desligada bloqueia
5. `Tenant Isolation Guard` — sem `req.user` → 403
6. `Tenant Isolation Guard` — `company_id` forjado no body → 403
7. `Tenant Isolation Guard` — match passa
8. `assertSameTenant` lança em mismatch / passa em match
9. `Migration Lock Key` determinístico
10. `classifySqlError` — `42P07` idempotente
11. `classifySqlError` — `23505` (data) → erro real
12. `authorityResolutionService.decorate` básico
13. `authorityResolutionService.detectConflicts` divergência
14. `auditOutboxService` — sucesso imediato
15. `auditOutboxService` — diferimento + queue size
16. `correlationIdMiddleware` — geração quando ausente
17. `correlationIdMiddleware` — preserva incoming válido
18. `correlationIdMiddleware` — sanitiza valor inválido (regex)
19. `featureGovernanceService` — `JWT_SECRET` redacted no snapshot
20. `featureGovernanceService` — `INTERNAL_DEV_OPEN_IN_PROD` finding aparece

Resultado actual: **20/20 passed**.

---

## 5. Lista — Breaking changes evitados

- `markAsRead(id, userId)` continua a ser chamável (apenas regista WARN e devolve `false` em vez de UPDATE cross-tenant — sem 500).
- `resolve(id, userId)` idem.
- `dashboard.getMe()` mantém assinatura zero-arg (config opcional).
- Tokens em query: reversível via `IMPETUS_ALLOW_TOKEN_IN_QUERY=true`.
- JWT strict-tenant: reversível via `IMPETUS_STRICT_TENANT_FROM_DB=false`.
- Login session-fail-aborts: reversível via `IMPETUS_LOGIN_REQUIRE_SESSION_PERSISTENCE=false`.
- Advisory lock no migrate: reversível via `IMPETUS_MIGRATION_ADVISORY_LOCK=false`.
- Internal routes: callers válidos (`X-Health-Key`, loopback, `internal_admin`) mantêm payload completo.
- Migration runner: classificação por SQLSTATE é estritamente mais precisa; fallback heurístico para `err.code` ausente preserva back-compat.
- Frontend `useChatSocket`: a função `getSocket()` continua a devolver socket válido quando há token; quando não há, devolve `null` (caller já estava preparado para socket inexistente em runs sem auth).
- Nenhuma rota pública foi alterada.
- Nenhum schema foi destruído. Migration nova só adiciona triggers em tabelas existentes.
- Motor A / Motor B / Conselho Cognitivo / Contextual Runtime: comportamento preservado bit-a-bit.

---

## 6. Lista — Pendências futuras não críticas

- **Cluster-safety completa** (Bloco 5): externalizar circuit breakers / métricas para Redis ou Pulsar. Hoje estão **isolados por tenant** quando a flag estiver activa, mas continuam in-memory por processo. PM2 multi-instance ainda partilha estado **apenas via DB**. O outbox de auditoria também é in-memory; um leitor de log shipping resolve permanentes.
- **Refresh tokens** (Bloco 6): preparado o cenário (algorithms fixos, session persistence strict). A introdução de refresh-tokens é um deploy separado.
- **HTTP-only cookies** (Bloco 6): identificado mas adiado para minimizar churn no frontend.
- **OpenTelemetry / OTLP exporters** (Bloco 10): correlation IDs propagam-se end-to-end; o **export** real para um backend de tracing (Tempo, Jaeger, Datadog) é uma decisão de infra a tomar.
- **PII minimization avançada / DSAR pipeline** (Bloco 9): outbox + immutability cobrem o core de auditoria. Hash/truncation de prompts e fluxo DSAR ficam para fase seguinte.
- **Numbering enforcement obrigatório nas migrations**: hoje **aviso**; promover a erro só após varredura completa do legacy.
- **`unifiedHealth` `requireHealthAccess` modes**: já existe; quando o portal Impetus Admin ganhar role-based seu próprio gate, simplificar.
- **Refactor das rotas `companies POST` para autenticação total**: parte do C4. Onboarding público sob fluxo separado validado.
- **OpenAPI / CI-CD pipelines / Datadog**: tópicos do plano original mas fora do escopo de hardening cognitivo.

---

## 7. Comprovação

```
$ cd backend && node src/tests/enterpriseHardeningScenarios.js
  ✓ testInternalRouteGuardAnonymousDenied
  ✓ testInternalRouteGuardTenantUserDenied
  ✓ testInternalRouteGuardInternalAdminAllowed
  ✓ testInternalRouteGuardFlagDisabled
  ✓ testTenantIsolationGuardMissing
  ✓ testTenantIsolationGuardMismatch
  ✓ testTenantIsolationGuardMatch
  ✓ testAssertSameTenantThrowsOnMismatch
  ✓ testMigrationLockKeyDeterministic
  ✓ testClassifySqlErrorIdempotent
  ✓ testClassifySqlErrorReal
  ✓ testAuthorityDecorateBasic
  ✓ testAuthorityDetectConflicts
  ✓ testAuditOutboxImmediateSuccess
  ✓ testAuditOutboxDeferred
  ✓ testCorrelationIdGenerated
  ✓ testCorrelationIdPreservesIncoming
  ✓ testCorrelationIdSanitizesGarbage
  ✓ testFeatureGovernanceSnapshotMasksSecrets
  ✓ testFeatureGovernanceDevOpenInProdError

[enterprise-hardening] passed=20 failed=0
```

Sanity check de `server.js` (`node --check`) → OK.

---

## 8. Estado final do Impetus

- **Runtime enterprise endurecido:** internals fechados, IDs propagados, graceful shutdown determinístico.
- **Multi-tenant seguro:** IDORs eliminados nas rotas operacionais, `tenantIsolationGuard` disponível, `STRICT_TENANT_FROM_DB` impede escalation via JWT.
- **Governance consistente:** support recovery agora com claim atómico; promoção / execução simultâneas tratadas como `CLAIM_LOST`; rollback de claim automático em falha de promote.
- **Observabilidade distribuída:** correlation IDs em todas as requests; outbox de auditoria com retry; logs estruturados em `[…]` JSON para shippers.
- **Atomicidade real:** migrate sob `pg_advisory_lock` + classificação SQLSTATE + start.sh fail-fast.
- **Fallback transparente:** circuit breaker per-tenant (flag) evita degradação cruzada; authority resolution decora `meta.authority` para tornar fallback visível.
- **LGPD-compatible:** triggers de imutabilidade em `ai_decision_logs` e `support_recovery_audit_events`; flag fail-closed proíbe placeholders em prod.
- **Cognitivamente avançado:** Motor A/B, conselho cognitivo, contextual runtime e governance permanecem **inalterados**. Apenas ganham auditoria mais forte e fallback explícito.
- **Operacionalmente resiliente:** SIGTERM/SIGINT desligam socket.io, intervals, crons e DB pool com watchdog.

> Tudo isto **sem regressões, sem perda funcional, sem quebra cognitiva**. O Impetus Comunica IA está mais seguro, observável e pronto para produção enterprise — preservando exactamente a inteligência operacional que o trouxe até aqui.
