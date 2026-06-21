# Quality NC → CAPA — Evidência E2E (Parte 7.2)

**Run:** cert-1782077258269  
**Data:** 2026-06-21  
**Resultado:** OK

## Fluxo executado

1. `POST /api/quality-intelligence/inspections` — inspeção `non_conforming` → `quality_inspections`
2. `POST /api/internal/quality-universal/workflows/instance` — `ncr_universal`
3. `POST .../workflows/transition` — action `submit` → evento `quality.ncr.opened`
4. `POST .../workflows/instance` — `capa_universal` vinculada à NC
5. `POST .../workflows/transition` — action `submit` → evento `quality.capa.created`

## Artefatos nesta pasta

| Ficheiro | Descrição |
|----------|-----------|
| `request.json` | Payload NC (PII-free) |
| `response_inspection.json` | Resposta inspeção |
| `response_ncr_create.json` | Instância NCR |
| `response_ncr_transition.json` | Transição NCR |
| `response_capa_create.json` | Instância CAPA |
| `response_capa_transition.json` | Transição CAPA |
| `db_row_inspection.json` | Linha `quality_inspections` |
| `db_row_workflows.json` | Instâncias workflow |
| `db_row_audit.json` | Cadeia audit |
| `db_verify.sql` | Query de verificação |
| `log_excerpt.txt` | Trace run |
| `tenant_isolation.json` | Tenant B → 403, sem leak |
| `screenshot.txt` | UI NcrCapaPanel ainda stub |
| `report.json` | Relatório consolidado |

## Classificação matriz

- **Backend NC/CAPA workflow:** VERDE
- **QualityOperationalWorkspacePage / NcrCapaPanel:** INCOMPLETO (UI stub)
- **Cenário agregado:** VERDE (API + BD + isolamento)

## Script

```bash
node backend/scripts/audit/e2e_quality_nc_capa.js
node backend/scripts/audit/applyCertEvidenceToMatrix.js
```
