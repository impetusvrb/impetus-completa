# OPM-001D — Compatibility Matrix

**Data:** 2026-07-19

---

## Certificações upstream preservadas

| Programa | Status |
|----------|--------|
| ARC-001 / ARC-002 | ✅ Intactos |
| ARC-003 (EOX) | ✅ Intacto |
| ARC-003A (Recovery) | ✅ Intacto |
| NAV-001 / NAV-002 / NAV-002A | ✅ Intactos |
| OPM-001A (Industrial Module) | ✅ Intacto |
| OPM-001B (Warehouse Foundation) | ✅ Intacto |
| OPM-001C (Warehouse Operations) | ✅ Intacto |
| WMS-007A | ✅ Intacto |

---

## OPM-001D — alterações

| Tipo | Descrição |
|------|-----------|
| **NOVO** | `certification/opm001dOperationalBaselineRegistry.js` |
| **NOVO** | `tests/opm001d/opm001dOperationalBaselineCertificationTests.mjs` |
| **NOVO** | Evidências OPM-001D + backlog UX-002 |
| **ZERO** | Alterações backend, APIs, RBAC, flags, runtime |

---

## Separação de responsabilidades (confirmada)

```
┌─────────────────────────────────────┐
│  EOX Enterprise Shell               │  ← ARC-003 / 003A
│  (header, breadcrumb, retornos)     │
├─────────────────────────────────────┤
│  Domain Adapter (EoxDomainNavLayout)│  ← OPM-001D certified
├─────────────────────────────────────┤
│  Domain Original Layout & Widgets   │  ← OPM-001A/B/C + domínios
└─────────────────────────────────────┘
```

---

## Gate para OPM-002A

A plataforma só avança para Inventory Foundation quando:

1. ✅ OPM-001D tests passam
2. ✅ ARC-003A tests passam (context forward)
3. ✅ Regressão OPM-001A/B/C passa
4. ✅ Nenhuma regressão bloqueadora aberta

**Gate: OPEN**
