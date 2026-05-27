# Observability vs Execution — Architectural Separation

## Status: IMPLEMENTADO (Fase T1.A.1 — Prompt 07)

---

## 1. Visão Geral

Separação formal entre 5 estágios de operação de qualquer módulo do IMPETUS:

| Estágio | Descrição | Side Effects | Exemplo |
|---------|-----------|:------------:|---------|
| **OBSERVABILITY** | Observa, mede, loga. Zero side effects. | ❌ | Shadow comparator, audit trail |
| **ENRICH** | Adiciona informação ao contexto. Não decide, não executa. | ❌ | Cognitive envelope, Runtime Z |
| **ASSISTIVE** | Sugere, recomenda. Requer confirmação humana. | ❌ | ManuIA diagnóstico, Pró-Ação evaluate |
| **EXECUTION** | Executa acções reais (DB, API, state). | ✅ | Chat IA, ManuIA orders, Auth |
| **AUTHORITATIVE** | Fonte de verdade que governa outros componentes. | ✅ | Visibility, Feature Flags, Settings |

---

## 2. Flag de Controle

```
IMPETUS_RUNTIME_STATE_ENFORCEMENT=off|audit|enforce
```

| Modo | Comportamento |
|------|---------------|
| **off** (default) | Zero impacto. Backward compatible. |
| **audit** | Loga violations sem bloquear. |
| **enforce** | Bloqueia side effects não autorizados. |

---

## 3. Ficheiros Criados

| Ficheiro | Responsabilidade |
|----------|-----------------|
| `backend/src/governance/runtimeStateClassification.js` | Registry de estágios, classificações core, canExecute(), canEscalate() |
| `backend/src/middleware/executionGateMiddleware.js` | Middleware per-route para gating explícito |
| `backend/src/middleware/runtimeStateEnforcementMiddleware.js` | Middleware global — side-effect isolation automática |

---

## 4. Classificações Core (29 módulos)

### OBSERVABILITY (3)
- `governance.shadow` — Shadow comparator
- `governance.audit` — Audit trail
- `engine_v2.gateway` — Diff/shadow gateway

### ENRICH (7)
- `dashboard.kpis` — Enriquece payload com KPIs
- `dashboard.layout` — Compõe layout
- `cognitive.envelope` — Enrichment de contexto
- `cognitive.pulse` — Estado operacional
- `engine_v2.composition` — Widget composition
- `runtime_z.sovereign` — Soberania contextual
- `runtime_z.sz5` — Memória conversacional

### ASSISTIVE (2)
- `manuia.diagnostics` — Sugere diagnósticos
- `proacao.evaluate` — Avaliação IA

### EXECUTION (13)
- `dashboard.chat` — Chat IA
- `dashboard.panel_command` — Smart Panel
- `cognitive.council` — Decisões IA
- `manuia.orders` — Ordens de serviço
- `integrations.edge_ingest` — Dados IoT
- `integrations.mes_erp` — MES/ERP push
- `proacao.create` — Criar propostas
- `admin.users` — CRUD usuários
- `pulse.submit` — Submeter avaliação
- `pulse.trigger` — Disparar ciclo
- `auth.login` — Autenticação
- `lgpd.anonymize` — Anonimização (irreversível)
- `lgpd.delete` — Delete account (irreversível)

### AUTHORITATIVE (4)
- `dashboard.visibility` — Source-of-truth sections
- `governance.failsafe` — Deny-first failsafe
- `governance.flags` — Feature flags
- `admin.settings` — Configurações empresa

---

## 5. Comportamento de Segurança

### Permit-by-default para módulos não classificados
Módulos legados (Motor A, outros) que não estão no registry são **sempre permitidos** para garantir backward compatibility.

### Side-effect isolation
Somente módulos com stage `execution` ou `authoritative` podem:
- Escrever no banco de dados
- Chamar APIs externas
- Mutar estado global
- Disparar notificações

### Escalação unidirecional
Um módulo não pode **desescalar** (ex: `execution` → `observability`). Apenas escalação é permitida.

---

## 6. Validação de Compatibilidade

| Runtime | Stage | Resultado |
|---------|-------|-----------|
| Runtime Z (sovereign) | enrich | ✅ Compatível |
| Runtime Z SZ5 | enrich | ✅ Compatível |
| Engine V2 (composition) | enrich | ✅ Compatível |
| Engine V2 (gateway) | observability | ✅ Compatível |
| cognitiveRuntimeFacade | enrich | ✅ Compatível |
| Motor A (unclassified) | — | ✅ Permit-by-default |
| SZ1–SZ4 (unclassified) | — | ✅ Permit-by-default |

---

## 7. Endpoints de Diagnóstico

```
GET /api/admin/runtime/state-classification → Mapa completo + stats
GET /api/admin/runtime/state-enforcement   → Stats do enforcement middleware
```

---

## 8. Rollback

```bash
# Desativar completamente (zero impacto):
IMPETUS_RUNTIME_STATE_ENFORCEMENT=off

# Restart:
pm2 restart impetus-backend --update-env
```

---

## 9. Riscos

| Risco | Mitigação |
|-------|-----------|
| Falso positivo em enforce mode | Default=off; escalação gradual off→audit→enforce |
| Módulo novo não classificado | Permit-by-default para unclassified |
| Circular dependency | Nenhuma — módulos são string IDs, zero import cycles |
| Performance overhead | Single string comparison per request (O(n) prefix match, n=14) |

---

## 10. Dependências

- `flagReconcilerRuntime.js` — reconhece `IMPETUS_RUNTIME_STATE_ENFORCEMENT` como flag crítica
- `universalAuditMiddleware.js` — executa antes, captura audit logs
- `correlationId` middleware — propaga correlation ID para logs

---

## 11. Próximos Passos (Não implementados nesta fase)

1. **Dynamic registration API** — módulos se auto-registam ao carregar
2. **Audit DB persistence** — enforcement violations persistidas em `audit_universal_log`
3. **Dashboard de estágios** — visualização frontend dos módulos e seus states
4. **Shadow mode obrigatório** — novos módulos devem passar 7 dias em shadow antes de execution
