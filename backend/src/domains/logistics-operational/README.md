# Domain: logistics-operational (WMS)

**Programa:** WMS-001 → WMS-003  
**Bounded context:** `logistics-operational`  
**Estado:** Operational APIs **ACTIVE** · produção **desligada** (flags OFF)

## Escopo

WMS operacional isolado de `logistics_native` cognitivo e de `supply_native`.

## Estrutura

- `compatibility/` — OCL · routing · canonical contracts
- `controllers/` — WMS-003 API controllers (OCL-only)
- `routes/` — `/api/logistics-operational/v1/*`
- `middleware/` — API gates · RBAC
- `services/` — Core services (WMS-002, consomem OCL)
- `shared/` — flags · RBAC · observability

## API v1

Base: `/api/logistics-operational/v1`  
Requer: `IMPETUS_WMS_API_ENABLED=true` (default false)

## Testes

```bash
npm run test:wms-api
npm run test:wms-foundation
npm run test:rbac
npm run test:canonical-contracts
```

## Próxima fase

WMS-004 — Frontend Workspace
