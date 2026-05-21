# Pilot Reactivation Recovery (Z.17)

## Problema

`pm2 reload` limpa `pilotTenantRegistry` e `tenantEnforcementState` em memória.

## Solução

1. Ao activar piloto com `execute` + `approved_by`, gravar em `backend/data/operational-validation/pilot-activations.json`.
2. No boot (`server.js`), `recoverApprovedPilotsOnBoot()` restaura apenas tenants com `reload_recovery_ready: true`.

## Restauração (sem auto-expansion)

- `registerPilotTenant`
- `setTenantEnforcementActive` + channels menu/kpi/summary
- **Não** activa novos tenants automaticamente

## Reactivação manual

```http
POST /api/internal/operational-validation/pilots/reactivate
{ "tenant_id": "...", "execute": true, "approved_by": "..." }
```

```http
GET /api/internal/operational-validation/reload-recovery?force=true
```
