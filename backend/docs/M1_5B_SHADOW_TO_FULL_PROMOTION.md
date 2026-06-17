# M1.5B — Shadow → Full Promotion (Consolidated Validation)

**Data:** 2026-06-15  
**Fase:** M1.5B — Shadow → Full Promotion & Production Validation  
**Pré-requisito:** M1.5A (`M1_5A_SHADOW_RUNTIME_READINESS_COMPLETE`)  
**Backup:** `backend/.env.backup_pre_m1_5b_20260615_205044`  
**Acção operacional:** `pm2 restart impetus-backend --update-env` (executado)

---

## Veredicto consolidado

```json
{
  "phase": "M1.5B",
  "pass": true,
  "verdict": "M1_5B_ALL_EXISTING_DOMAINS_PRODUCTION_READY"
}
```

```json
{
  "safety_promoted": true,
  "environment_promoted": true,
  "executive_promoted": true,
  "maintenance_promoted": true,
  "hr_promoted": true,
  "financial_ready": true,
  "food_base_ready_for_onboarding": true
}
```

---

## 1. Resumo executivo

Todos os domínios **Grupo A** auditados em M1.5A foram promovidos de shadow para runtime operacional real via **configuração `.env` + restart PM2**, sem alteração de schemas, remoção de código ou quebra de Truth Program / AIOI / TRI-AI / P0A–P0E.

| Domínio | Antes (M1.5A) | Depois (M1.5B) | Relatório |
|---------|---------------|----------------|-----------|
| SST | shadow | **full + safety_native** | [M1_5B_SAFETY_PROMOTION.md](./M1_5B_SAFETY_PROMOTION.md) |
| Ambiental | shadow | **full + environmental_native + live active** | [M1_5B_ENVIRONMENT_PROMOTION.md](./M1_5B_ENVIRONMENT_PROMOTION.md) |
| Executive | shadow | **executive_boardroom + live active** | [M1_5B_EXECUTIVE_PROMOTION.md](./M1_5B_EXECUTIVE_PROMOTION.md) |
| Manutenção | shadow | **maintenance_native + live active** | [M1_5B_MAINTENANCE_PROMOTION.md](./M1_5B_MAINTENANCE_PROMOTION.md) |
| RH | shadow | **hr_native** | [M1_5B_HR_PROMOTION.md](./M1_5B_HR_PROMOTION.md) |
| Financeiro | partial (gating) | **validado, runtime inalterado** | [M1_5B_FINANCIAL_VALIDATION.md](./M1_5B_FINANCIAL_VALIDATION.md) |

---

## 2. Mapeamento spec → valores canónicos

A spec M1.5B usa `production_native` como valor genérico. O código IMPETUS usa identificadores por domínio:

| Variável spec | Valor spec | Valor aplicado no `.env` |
|---------------|------------|--------------------------|
| `IMPETUS_SAFETY_COGNITIVE_RUNTIME` | `production_native` | `safety_native` |
| `IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME` | `production_native` | `environmental_native` |
| `IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION` | `production_native` | `active` |
| `IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME` | `production_native` | `executive_boardroom` |
| `IMPETUS_EXECUTIVE_LIVE_VALIDATION` | `production_native` | `active` |
| `IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME` | `production_native` | `maintenance_native` |
| `IMPETUS_MAINTENANCE_LIVE_VALIDATION` | `production_native` | `active` |
| `IMPETUS_HR_COGNITIVE_RUNTIME` | `production_native` | `hr_native` |

Semântica equivalente: runtime cognitivo nativo de produção activo, shadow desactivado.

---

## 3. Validação infraestrutura global (preservada)

| Camada | Estado pós M1.5B |
|--------|------------------|
| Backend PM2 | ✅ online · 0 unstable_restarts |
| `/api/health` | ✅ `status: ok` |
| TRI-AI | ✅ OpenAI · Anthropic · Vertex UP |
| AIOI pipeline | ✅ `IMPETUS_AIOI_ENABLED=true`, outbox + continuous workers |
| Event pipeline | ✅ `IMPETUS_EVENT_PIPELINE_ENABLED=true` |
| Truth Program | ✅ `IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce` (inalterado) |
| Action Runtime | ✅ `IMPETUS_ACTION_RUNTIME_MODE=on` |
| Workflow Engine | ✅ ON (P0) |

---

## 4. Testes automatizados executados

| Suite | Resultado |
|-------|-----------|
| `safety-publication-activation` | 4 passed, 0 failed |
| `environment-publication-activation` | 5 passed, 0 failed |

---

## 5. M1.5B.7 — Food Base readiness checklist

**Modo:** Readiness only — **sem criar tenant**, **sem alterar pilot lists**.

### 5.1 Estado actual

| Item | Ready | Evidência / Nota |
|------|-------|------------------|
| `company_id` definido | ⚠️ **Pendente decisão** | Não existe tenant "Food Base" na BD. Candidatos: `find fish alimentos` (`21dd3cee`), `Fresh & Fit` (`511f4819`) |
| Pilot tenants (AIOI) | ✅ Infra ON | `IMPETUS_AIOI_PILOT_TENANTS=21dd3cee,ffd94fb8` — Food Base ainda não incluída |
| RLS | ✅ Modo ON | `IMPETUS_RLS_MODE=on` · pilot `21dd3cee` |
| MFA | ✅ Modo ON | `IMPETUS_MFA_ENABLED=true` · pilot `21dd3cee` |
| Federation | ✅ Modo ON | `IMPETUS_FEDERATION_MODE=on` · pilot `21dd3cee` |
| Action Runtime | ✅ ON | `IMPETUS_ACTION_RUNTIME_MODE=on` · pilots 21dd3cee, ffd94fb8, 511f4819 |
| Workflow Engine | ✅ ON | `IMPETUS_WORKFLOW_ENGINE_ENABLED=true` |
| AIOI | ✅ ON | Workers + queue + bus outbox activos |

### 5.2 Checklist pré-onboarding (executar quando tenant confirmado)

- [ ] Confirmar qual `company_id` representa Food Base (ou criar via provisionamento normal)
- [ ] Adicionar `company_id` a `IMPETUS_AIOI_PILOT_TENANTS`
- [ ] Adicionar a `IMPETUS_RLS_PILOT_TENANTS`, `IMPETUS_MFA_PILOT_TENANTS`, `IMPETUS_FEDERATION_PILOT_TENANTS`
- [ ] Adicionar a `IMPETUS_ACTION_RUNTIME_PILOT_TENANTS`, `IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS`
- [ ] Adicionar a listas telemetria (MQTT/OPC-UA/Modbus/Edge) se aplicável
- [ ] Atribuir roles CEO/CFO com `VIEW_FINANCIAL` + `VIEW_STRATEGIC`
- [ ] `pm2 restart impetus-backend --update-env`
- [ ] Smoke test por domínio no tenant piloto

```json
{
  "food_base_ready_for_onboarding": true,
  "interpretation": "Infraestrutura e domínios promovidos prontos; falta apenas decisão de tenant_id e inclusão nas listas pilot (fora do escopo M1.5B por design)"
}
```

Referência: [FOOD_BASE_PILOT_READINESS_AUDIT.md](./FOOD_BASE_PILOT_READINESS_AUDIT.md)

---

## 6. Rollback global

```bash
cp backend/.env.backup_pre_m1_5b_20260615_205044 backend/.env
pm2 restart impetus-backend --update-env
```

Restaura estado shadow M1.5A para todos os domínios Grupo A.

---

## 7. Próximo marco

**M2 — MES operacional:** foundation M1 (`mes`, `logistics`, `analytics`) permanece READ ONLY / NO AUTO ACTION até implementação M2.

Domínios existentes (Grupo A) estão **production ready** para piloto operacional assim que Food Base tenant for onboarded.

---

## 8. Relatórios filhos

| ID | Documento |
|----|-----------|
| M1.5B.1 | [M1_5B_SAFETY_PROMOTION.md](./M1_5B_SAFETY_PROMOTION.md) |
| M1.5B.2 | [M1_5B_ENVIRONMENT_PROMOTION.md](./M1_5B_ENVIRONMENT_PROMOTION.md) |
| M1.5B.3 | [M1_5B_EXECUTIVE_PROMOTION.md](./M1_5B_EXECUTIVE_PROMOTION.md) |
| M1.5B.4 | [M1_5B_MAINTENANCE_PROMOTION.md](./M1_5B_MAINTENANCE_PROMOTION.md) |
| M1.5B.5 | [M1_5B_HR_PROMOTION.md](./M1_5B_HR_PROMOTION.md) |
| M1.5B.6 | [M1_5B_FINANCIAL_VALIDATION.md](./M1_5B_FINANCIAL_VALIDATION.md) |
| M1.5B.7 | §5 deste documento |
| M1.5B.8 | Este documento |
