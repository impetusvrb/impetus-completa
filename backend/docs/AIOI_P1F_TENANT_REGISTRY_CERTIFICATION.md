# AIOI-P1F — Tenant Registry Certification

**Data:** 2026-06-13  
**Modo:** SHADOW · READ ONLY  
**Serviço:** `aioiTenantRegistryService.js`  
**Script:** `backend/scripts/p1f_horizontal_validation.js`

---

## Objetivo

Certificar que o Tenant Registry preparado em P1E é confiável em modo shadow — sem ativar no worker certificado.

---

## Cenários Validados

| Cenário | Tenants | Source | Load (ms) | UUID válido | Duplicatas | Pass |
|---------|---------|--------|-----------|-------------|------------|------|
| Registry vazio | 0 | IMPETUS_AIOI_PILOT_TENANTS | 1 | ✓ | 0 | PASS |
| Registry 10 | 10 | IMPETUS_AIOI_TENANT_REGISTRY | 0 | ✓ | 0 | PASS |
| Registry 50 | 50 | IMPETUS_AIOI_TENANT_REGISTRY | 0 | ✓ | 0 | PASS |
| Registry 100 | 100 | IMPETUS_AIOI_TENANT_REGISTRY | 6 | ✓ | 0 | PASS |
| Input duplicado | 2 (deduped) | IMPETUS_AIOI_TENANT_REGISTRY | — | ✓ | 0 | PASS |

---

## Métricas de Memória

| Cenário | Heap (MB) | Delta (MB) |
|---------|-----------|------------|
| Vazio/fallback | 7.62 | 0.01 |
| 10 tenants | 7.89 | 0.24 |
| 50 tenants | 8.03 | 0.03 |
| 100 tenants | 7.37 | -0.87 |

Consumo marginal — adequado para registry enterprise até 100 tenants.

---

## Fallback Pilot

Quando `IMPETUS_AIOI_TENANT_REGISTRY` está vazio:

- Source: `IMPETUS_AIOI_PILOT_TENANTS`
- `registry_enabled: false`
- `validation_ok: true`
- Zero breaking changes confirmado

---

## Deduplicação

Input `[uuid-A, uuid-A, uuid-B]` → output 2 tenants únicos, `duplicates_in_result: 0`.

---

## Veredito

**AIOI_P1F_TENANT_REGISTRY_CERTIFICATION_PASS**

```json
{
  "tenant_registry_certified": true,
  "scenarios_passed": 5,
  "scenarios_total": 5
}
```

---

## Restrições Respeitadas

- Registry **não** ativado no `aioiContinuousWorkerService`
- `aioiPilotFlags.js` inalterado
- Invariantes runtime preservados
