# AIOI-P1G — Tenant Registry Activation

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1G_REGISTRY_ACTIVATION_PASS`

---

## Objetivo

Integrar `aioiTenantRegistryService` ao `aioiContinuousWorkerService` com feature flag e fallback automático.

---

## Feature Flag

```env
IMPETUS_AIOI_REGISTRY_ACTIVE=false   # default — comportamento P1A–P1F inalterado
```

**Rollback:** definir `IMPETUS_AIOI_REGISTRY_ACTIVE=false` — efeito imediato no próximo ciclo.

---

## Comportamento

| Flag | Source | Tenants |
|------|--------|---------|
| `false` | `IMPETUS_AIOI_PILOT_TENANTS` | Pilot certificado (2) |
| `true` + registry vazio | `IMPETUS_AIOI_PILOT_TENANTS` | Fallback automático |
| `true` + registry válido | `IMPETUS_AIOI_TENANT_REGISTRY` | Registry configurado |

---

## Resultados da Certificação

Execução: `node backend/scripts/p1g_horizontal_activation.js`

```json
{
  "registry_activation_pass": true,
  "fallback_verified": true,
  "runtime_unchanged_when_disabled": true
}
```

### Cenários

| Cenário | Source | Fallback | Pass |
|---------|--------|----------|------|
| Flag OFF | PILOT_TENANTS | false | ✓ |
| Flag ON + registry vazio | PILOT_TENANTS | true (registry_empty) | ✓ |
| Flag ON + registry pilot UUIDs | TENANT_REGISTRY | false | ✓ |

### Load Performance

| Modo | Elapsed (ms) |
|------|--------------|
| Registry OFF | 4 |
| Registry ON | 1 |

---

## Integração

Serviço: `aioiHorizontalActivationService.resolveActiveTenants()`  
Worker: `aioiContinuousWorkerService.executeCycle()` — delegação aditiva.

---

## Invariantes

Preservados — `runtime_enabled/active/authorized=false`, `auto_execute_band=none`.
