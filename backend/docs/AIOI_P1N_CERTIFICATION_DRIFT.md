# AIOI-P1N — Certification Drift Detection

**Data:** 2026-06-13  
**Tag:** `P1N-CERTIFICATION-DRIFT`  
**Veredito:** `AIOI_P1N_ENTERPRISE_COMPLIANCE_AND_OPERATIONAL_INTEGRITY_PASS`

---

## Objetivo

Detectar deriva estrutural após certificação P1A–P1M: serviços removidos, documentação ausente, dependências quebradas, regressões na cadeia de certificação.

---

## Componente P1N.2

| ID | Serviço | Ficheiro |
|----|---------|----------|
| P1N.2 | Certification Drift | `aioiCertificationDriftService.js` |

### Detecções

- `detectMissingServices()` — ficheiros obrigatórios em `runtime/`
- `detectMissingDocumentation()` — docs P1A–P1M
- `detectBrokenDependencies()` — módulos carregáveis
- `detectCertificationRegression()` — registry + dependências
- `generateDriftStatus()` — consolidação

---

## Critério

```json
{
  "certification_drift": false
}
```

---

## API (READ ONLY)

```
GET /api/aioi/compliance/drift
```
