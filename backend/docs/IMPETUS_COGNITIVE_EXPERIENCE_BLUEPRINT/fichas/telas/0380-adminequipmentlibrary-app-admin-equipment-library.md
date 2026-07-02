# Etapa 380 — Tela: AdminEquipmentLibrary

> ICEB v1.0 · Gerado automaticamente

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 380 / 1060 |
| **Rota** | `/app/admin/equipment-library` |
| **Componente** | `./pages/AdminEquipmentLibrary` |
| **Módulo** | Admin |
| **Status CERT** | VERDE |
| **Classificação** | AB |

## Propósito

Ecrã `AdminEquipmentLibrary` — IECP probe OK: 200.

## Guards

PrivateRoute, SetupGuard, CEORouteGuard, ColaboradorRouteGuard, StrictAdminRouteGuard

## Perfis

admin (strict)

## APIs

Ver cruzamento em `FUNCTIONAL_MATRIX.md` e `api.js` para rota `/app/admin/equipment-library`.

## Evidências

- `backend/docs/evidence/screens/Admin/AdminEquipmentLibrary/`

---
*Etapa 380 · ICEB auto-gen*
