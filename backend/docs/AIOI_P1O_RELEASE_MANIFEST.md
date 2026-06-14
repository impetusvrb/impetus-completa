# AIOI-P1O — Release Manifest

**Data:** 2026-06-14  
**Tag:** `P1O-RELEASE-MANIFEST`  
**Veredito:** `AIOI_P1O_ENTERPRISE_BASELINE_PRESERVATION_AND_RELEASE_PASS`

---

## Objetivo

Gerar manifesto único e consolidado da baseline certificada P1A–P1N.

---

## Componente P1O.2

| ID | Serviço | Ficheiro |
|----|---------|----------|
| P1O.2 | Release Manifest | `aioiReleaseManifestService.js` |

### Funções

- `generateReleaseManifest()` — manifesto consolidado
- `validateManifest()` — validação formal

---

## Manifesto esperado

```json
{
  "baseline": "P1A-P1N",
  "phases": 14,
  "certified": true
}
```

---

## Critério

```json
{
  "release_manifest_ready": true
}
```

---

## API (READ ONLY)

```
GET /api/aioi/baseline/manifest
```
