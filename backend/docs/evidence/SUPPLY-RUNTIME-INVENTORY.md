# SUPPLY — Runtime Inventory

**Programa:** GF-022 → GF-027  
**Runtime:** `supply_native`  
**Estado:** **HOMOLOGATION COMPLETE**  
**Governança:** REV-001 · GF-027  
**Data:** 2026-07-18

---

## Capacidades

| Capacidade | Fase | Active | Status |
|------------|------|:------:|--------|
| Core Domain | GF-023 | YES | — |
| Signal Loader | GF-024 | YES | — |
| Promotion | GF-025 | YES | ACTIVE |
| Pilot Integration Layer | GF-026 | YES | ACTIVE |
| Canonical Bridge | GF-026 | YES | ACTIVE |
| **Supply REST APIs** | GF-027 | **YES** | **ACTIVE** |
| **Supply RBAC** | GF-027 | **YES** | **ACTIVE** |
| **Supply Workspace** | GF-027 | **YES** | **ACTIVE** |
| **Supply Homologation** | GF-027 | **YES** | **COMPLETE** |
| **INC-048 Convergence** | INC-048 | **YES** | **ACTIVE** |

---

## Convergence

Integração Supply ↔ WMS via `integration/inc048/` — Pilot Layer inalterada.

---

## API (`/api/supply/v1`)

8 entidades canónicas · contratos v0.2.0 · Pilot Layer para Logística.

---

## Testes

```bash
npm run test:supply-runtime-homologation
npm run test:supply-api
npm run test:supply-rbac
```

---

*Evidências:* [GF-027-HOMOLOGATION.md](./GF-027-HOMOLOGATION.md) · [INC-048-CONVERGENCE.md](./INC-048-CONVERGENCE.md)
