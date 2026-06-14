# AIOI-P1O — Baseline Registry

**Data:** 2026-06-14  
**Tag:** `P1O-BASELINE-REGISTRY`  
**Veredito:** `AIOI_P1O_ENTERPRISE_BASELINE_PRESERVATION_AND_RELEASE_PASS`

---

## Objetivo

Catalogar formalmente a baseline enterprise **P1A → P1N** com versão, veredito, dependências e documentação.

---

## Invariantes (inalterados)

```json
{
  "runtime_enabled": false,
  "runtime_active": false,
  "runtime_authorized": false,
  "cognitive_execution_allowed": false,
  "auto_execute_band": "none"
}
```

---

## Componente P1O.1

| ID | Serviço | Ficheiro |
|----|---------|----------|
| P1O.1 | Baseline Registry | `aioiBaselineRegistryService.js` |

### Funções

- `getBaselinePhases()` — 14 fases P1A–P1N
- `validateBaselineChain()` — dependências contínuas
- `getBaselineRegistry()` — registo consolidado

---

## Critério

```json
{
  "baseline_registered": true
}
```

---

## Versão baseline

`P1A-P1N-2026.06`
