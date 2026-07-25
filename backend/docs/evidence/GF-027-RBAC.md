# GF-027 — Supply RBAC

**Ficheiro:** `domains/supply/shared/supplyRbacDefinitions.js`

---

## Permissões

| Permissão | Capabilities |
|-----------|--------------|
| `supply.read` | view, manage, admin |
| `supply.write` | manage, admin |
| `supplier.manage` | manage, admin |
| `quotation.manage` | manage, admin |
| `contract.manage` | manage, admin |
| `approval.execute` | approve, admin |
| `purchase.request` | request, manage, admin |
| `purchase.order` | order, manage, admin |

---

## Perfis

| profile_code | Escopo |
|--------------|--------|
| `procurement_analyst` | read + purchase.request |
| `manager_procurement` | operacional completo |
| `manager_supply` | todas as permissões |

Admin / hierarchy ≤ 1 → bypass total.

---

## Middleware

`requireSupplyPermission(permission)` em todas as rotas v1.
