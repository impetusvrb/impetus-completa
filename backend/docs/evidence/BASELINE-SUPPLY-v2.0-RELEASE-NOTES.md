# BASELINE-SUPPLY-v2.0 — Release Notes

**Data:** 2026-07-18  
**Tipo:** Certified Baseline Release (Configuration Freeze)

---

## Resumo executivo

Primeira baseline oficial que consolida **Supply (GF-021→027)** e **Logística Operacional (WMS-001→006)** como plataforma integrada, certificada pela REV-002.

---

## Evolução desde BASELINE-SYSTEM v1.4

| Trilha | Entregas | Resultado |
|--------|----------|-----------|
| REV-001 | Gap Matrix | Backlog arquitectural |
| GF-021→027 | Supply completo | HOMOLOGATION |
| WMS-001→006 | WMS operacional | CERTIFIED |
| INC-048 | Convergência | Integração canónica |
| WMS-005 | Validação E2E | Pilot readiness |
| WMS-006 | Homologação congelada | Production readiness |
| REV-002 | Certification Gate | **CERTIFIED WITH CONDITIONS** |

---

## Greenfields concluídas

- **Supply** (`supply_native`) — REST v1, RBAC, workspace, pilot layer, promotion

## WMS concluído

- **logistics-operational** — OCL, APIs v1, workspace FE, RBAC

## INC-048

- Operational Convergence Layer — Supply + WMS sem acoplamento directo

---

## Certificação REV-002

**Verdict:** BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS

---

## Riscos residuais aceites

- GAP-LOG-001/002 PARTIAL
- Flags prod OFF (rollout controlado)
- GAP-WMS-005 activation gate
- GAP-PLAT-001 CI BD (infra)

---

## Mudanças incompatíveis

**Nenhuma** — baseline declarativa; sem alteração funcional vs estado certificado.

---

## Componentes congelados

- `supply_api`
- `supply_workspace`
- `supply_pilot_layer`
- `logistics_operational_api`
- `logistics_operational_workspace`
- `inc048_convergence`
- `supply_promotion_runtime`
