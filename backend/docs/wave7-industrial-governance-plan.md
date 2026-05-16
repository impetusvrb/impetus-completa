# WAVE 7 — Plano: Governança Industrial Enterprise Segura

> Governança industrial segura. Aditivo, flag-gated, observe-first. RBAC existente intacto.

---

## 1. Governance topology

```
backend/src/governance/
├── governanceFlags.js              ← feature flags WAVE 7
├── workflowCapabilityMatrix.js     ← capability matrix: workflow × roles × domínio
├── abacExtension.js                ← ABAC sobre RBAC (nunca substitui)
├── industrialAuditStructure.js     ← estrutura de auditoria industrial
├── immutableWorkflowAuditPrep.js   ← ledger append-only com hash chain
├── lgpdIndustrialPrep.js           ← classificação LGPD + hooks de consentimento
├── domainCapabilityGovernance.js   ← capabilities por domínio
├── workflowPermissionMatrix.js     ← permissões workflow × role × domínio
├── industrialTraceabilityFoundation.js ← chain-of-custody industrial
└── industrialGovernanceRuntime.js  ← orquestrador WAVE 7
```

---

## 2. Industrial compliance strategy

| Layer | Mecanismo | Modo inicial |
|-------|-----------|--------------|
| RBAC | `users.role` no JWT + BD (intacto) | enforce |
| ABAC extension | atributos domain/tenant/time/device | observe |
| Capability matrix | workflow × role | observe |
| Domain capability | per-domain capabilities | observe |
| LGPD | classificação + consentimento | structure-only |
| Workflow permission | matrix de permissões | observe |

---

## 3. Audit strategy

- `industrial_audit_events` — append-only por convenção de aplicação
- Dual-write: audit legado (ai_decision_logs) + industrial audit stream
- Hash chain para tamper-evidence (app layer; sem blockchain)
- Campos industriais: `domain`, `workflow_id`, `actor_id`, `actor_role`, `traceability_id`

---

## 4. Capability matrix

```
workflowType          → requiredRoles        → domain    → capability
---------------------------------------------------------------------------
quality.inspection    → [supervisor, gerente] → quality   → can_approve_inspection
safety.risk_assessment→ [supervisor, diretor] → safety    → can_assess_risk
logistics.dispatch    → [operador, supervisor]→ logistics  → can_dispatch_shipment
operational.alert     → [*]                  → operational→ can_acknowledge_alert
```

---

## 5. LGPD data classification

| Categoria | Exemplos | Retenção | Anonimização |
|-----------|---------|----------|--------------|
| `personal` | nome, CPF, email | 5 anos | on delete |
| `sensitive` | dados de saúde, biometria | 3 anos | pseudonimização |
| `operational` | KPIs, eventos de máquina | 10 anos | não necessária |
| `industrial` | telemetria, alertas | 10 anos | não necessária |

---

## 6. Rollback strategy

- Todos os módulos flag-gated (`IMPETUS_GOVERNANCE_V7_ENABLED` default false)
- ABAC extension em observe-only (`IMPETUS_ABAC_ENFORCE` default false)
- Audit industrial aditivo — não altera ai_decision_logs existentes
- Migration SQL: apenas CREATE TABLE IF NOT EXISTS

## 7. Gate W7→W8

- Capability matrix populada para ≥ 3 domínios
- ABAC observe mode sem erros por 48h
- Hash chain validado em staging
- LGPD classification seed aplicada
- Zero mudanças em RBAC legado
