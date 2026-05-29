# Industrial Safety & Environment Promotion Gate v1

**Documento oficial:** Gate de elegibilidade para saída de SHADOW — Safety (Z.25) e Environment (P1)  
**Data:** 2026-05-29  
**Versão:** 1.0.0  
**Status:** IMPLEMENTADO E VALIDADO  
**Uso:** Auditoria, certificação industrial, aprovação de promoção

---

## 1. Objetivo

Garantir que os domínios Safety (Z.25) e Environment (P1) **só possam operar em modo ON** quando todos os pré-requisitos de governança, segurança e responsabilidade estiverem provados tecnicamente.

**Resultado binário:**
- ❌ **BLOCKED** → permanece em SHADOW, lista gaps exactos
- ✅ **AUTHORIZED** → elegível para promoção (requer deploy manual de flags)

---

## 2. Arquitectura implementada

```
governance/domainPolicyEngine/
 ├── index.js                           (exports centrais)
 ├── domainPolicyEvaluator.js           (motor determinístico v1.0.0)
 ├── domainPublicationApprovalService.js (HITL + four-eyes + RBAC)
 ├── shadowExitGate.js                  (Gate com 9 checks automatizados)
 └── policies/
     ├── safety/
     │   └── safetyBaselinePolicies.json (3 policies NR-ready)
     └── environment/
         └── environmentBaselinePolicies.json (3 policies ISO 14001-ready)
```

**Rota API:** `GET /api/domain-governance-gate/gate/:domain`  
**Flag:** `IMPETUS_DOMAIN_POLICY_ENGINE=on`

---

## 3. Checklist técnico (9 verificações automáticas)

| # | Check | Descrição | Critério |
|---|-------|-----------|----------|
| 1 | `policy_engine_active` | Policy Engine versionado e activo | `IMPETUS_DOMAIN_POLICY_ENGINE=on` |
| 2 | `policies_loaded` | Policies versionadas carregadas | ≥1 policy para o domínio |
| 3 | `audit_immutable` | Industrial Audit habilitado | `IMPETUS_INDUSTRIAL_AUDIT_ENABLED=true` |
| 4 | `cognitive_shadow` | Cognitive runtime permanece SHADOW | `*_COGNITIVE_RUNTIME=shadow\|off` |
| 5 | `rbac_roles_defined` | RBAC publication roles definidos | approver/operator/viewer mapeados |
| 6 | `responsible_engineers` | Engenheiros responsáveis no tenant | ≥1 user com role approver na BD |
| 7 | `hitl_evidence` | Pelo menos 1 aprovação humana | ≥1 row approved em `domain_publication_approvals` |
| 8 | `global_cognitive_off` | IMPETUS_COGNITIVE_RUNTIME global OFF | valor = `off` |
| 9 | `publication_shadow_status` | Status actual (informativo) | — |

**Zero checks falhados = AUTHORIZED.**

---

## 4. Policy Engine — contrato

### Input

```json
{
  "domain": "safety|environment",
  "action_type": "publish|activate|promote|read_real_data|generate_report|alert",
  "user_role": "<role do utilizador>",
  "risk_level": "low|medium|high|critical",
  "runtime_mode": "shadow|on",
  "company_id": "<UUID>"
}
```

### Output

```json
{
  "result": "ALLOW|DENY|REQUIRE_APPROVAL",
  "policies_triggered": [...],
  "explanation": "texto determinístico",
  "engine_version": "1.0.0",
  "deterministic": true,
  "mode": "on|shadow|off"
}
```

### Propriedades garantidas

- **Determinístico:** mesmo input → mesmo output, sem randomness
- **Versionado:** `engine_version` + `policy_version` explícitos
- **Extensível:** adicionar JSON em `policies/safety/` ou `policies/environment/`
- **Sem side effects:** a função `evaluate()` é pura

---

## 5. Modelo HITL (Human-in-the-Loop)

### Fluxo

```
Evento → Policy Engine → REQUIRE_APPROVAL
    ↓
submitForApproval({ responsible_engineer_id })
    ↓
domain_publication_approvals (status: pending)
    ↓
Humano com role APPROVER → approve()
    ↓ (four-eyes: approver ≠ requester)
status: approved + audit trail persistido
    ↓
Publicação autorizada
```

### Four-eyes enforcement

O aprovador **NÃO pode** ser o mesmo utilizador que solicitou. Tentativa resulta em:

```json
{ "ok": false, "reason": "four_eyes_violation" }
```

### Tabela

`domain_publication_approvals` com: `id`, `company_id`, `domain`, `action_type`, `requested_by_user_id`, `responsible_engineer_id`, `status`, `policy_evaluation` (JSONB), `approved_by_user_id`, `approved_at`, `rejection_reason`, `expires_at` (72h TTL).

---

## 6. RBAC de publicação

| Domain | Approver (pode aprovar) | Operator (pode solicitar) | Viewer (só leitura) |
|--------|------------------------|--------------------------|---------------------|
| Safety | `safety_engineer`, `manager_safety`, `coordinator_safety`, `director_industrial` | `supervisor_safety`, `technician_safety` | `operator`, `colaborador` |
| Environment | `environmental_engineer`, `manager_environment`, `coordinator_environment`, `director_industrial` | `supervisor_environment`, `technician_environment` | `operator`, `colaborador` |

**Enforcement:** backend (`domainPublicationApprovalService.canApprove()`) — não depende de UI.

---

## 7. Audit trail imutável

- **Tabela:** `industrial_audit_events` (append-only)
- **Flag:** `IMPETUS_INDUSTRIAL_AUDIT_ENABLED=true`
- **Eventos persistidos:**
  - `approval_requested` — submissão de publicação
  - `approval_granted` — aprovação humana concedida
  - `approval_denied` — rejeição com motivo
  - `safety_activation_audit` — eventos do pipeline Safety
  - `environment_publication_audit` — eventos do pipeline Environment
- **Dual-write:** buffers in-memory mantidos para telemetria + BD para auditoria legal

---

## 8. Integração nos pipelines reais

| Pipeline | Ficheiro | Integração |
|----------|----------|------------|
| Safety activation | `domains/safety/activation/safetyActivationRuntime.js` | Chama `pe.evaluate()` em cada orquestração |
| Safety audit | `domains/safety/activation/safetyActivationAudit.js` | Persiste em `industrial_audit_events` |
| Environment publication | `domains/environment/publication/environmentPublicationRuntime.js` | Bloqueia publicação se policy → REQUIRE_APPROVAL |
| Environment audit | `domains/environment/publication/environmentPublicationAuditRuntime.js` | Persiste em `industrial_audit_events` |

---

## 9. Promoção de flags (após Gate AUTHORIZED)

```env
# Usar ACTIVATION_STAGE=full (não "on" — inválido no enum do motor)
IMPETUS_SAFETY_ACTIVATION_STAGE=full
IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=full
IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=false
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=false

# MANTER obrigatoriamente:
IMPETUS_SAFETY_COGNITIVE_RUNTIME=shadow
IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME=shadow
IMPETUS_COGNITIVE_RUNTIME=off
IMPETUS_DOMAIN_POLICY_ENGINE=on
IMPETUS_INDUSTRIAL_AUDIT_ENABLED=true
```

```bash
pm2 reload impetus-backend --update-env
```

---

## 10. Rollback (< 15 minutos)

```env
IMPETUS_SAFETY_ACTIVATION_STAGE=shadow
IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow
IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=true
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true
```

```bash
pm2 reload impetus-backend --update-env
```

---

## 11. O que "ON" significa após o Gate

| Aspecto | Estado |
|---------|--------|
| UI / visualização | **ON** |
| Ingest de dados industriais | **ON** |
| Avaliação normativa (policy engine) | **ON** |
| Recomendação assistiva | **ON** |
| Publicação definitiva | **ON (com HITL obrigatório)** |
| Aprovação humana | **OBRIGATÓRIA** |
| Autonomia IA | **❌ NUNCA** (cognitive=shadow) |
| Responsabilidade legal | **HUMANA** (responsible_engineer_id rastreável) |
| Audit trail | **IMUTÁVEL** (BD append-only) |

---

## 12. Evidência de validação (2026-05-29)

```
✅ Policy Engine: active=true, mode=on, v1.0.0, 6 policies
✅ Safety publish → REQUIRE_APPROVAL (2 policies triggered)
✅ Environment read_data (colaborador) → DENY
✅ RBAC: coordinator_safety=approver, supervisor=operator, colaborador=viewer
✅ Submission → approval_id criado em BD
✅ Four-eyes violation → bloqueado
✅ Approval por different user → status=approved
✅ Industrial Audit → 2 escritas BD, 0 falhas
✅ Gate Safety (após approval) → AUTHORIZED (9/9 checks)
✅ PM2 online, health=200
```

---

## 13. Critérios de aceitação industrial

Para emissão de certificado de conformidade:

- [ ] Gate retorna AUTHORIZED no tenant piloto
- [ ] Operador real tenta publicar → bloqueado por policy
- [ ] Engenheiro responsável aprova → publicação autorizada
- [ ] Colaborador tenta aprovar → rejeitado por RBAC
- [ ] Aprovador = solicitante → rejeitado (four-eyes)
- [ ] Todas as decisões visíveis em `industrial_audit_events`
- [ ] Rollback executado em < 15 minutos
- [ ] Zero mutação cross-domain
- [ ] Zero decisão autónoma

---

**Assinatura digital:** Este documento serve como evidência técnica para auditoria de conformidade SST (NR) e ambiental (ISO 14001) do sistema IMPETUS.
