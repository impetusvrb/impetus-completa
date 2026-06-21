# Evidências E2E (Parte 7)

Estrutura: `backend/docs/evidence/<dominio>/<cenario>/`

## Cenários certificados (10/10)

| Domínio | Pasta | Script |
|---------|-------|--------|
| Quality NC→CAPA | `quality/nc-create/` | `e2e_quality_nc_capa.js` |
| SST lifecycle | `safety/lifecycle/` | `e2e_sst_lifecycle.js` |
| Executive dashboard | `executive/dashboard-profile/` | `e2e_cert_part72_batch.js` |
| ManuIA diagnóstico→OS | `manuia/diagnosis-workorder/` | batch |
| ESG emissão/resíduo/água | `esg/emission-waste-consumption/` | batch |
| TPM preventiva | `tpm/preventive-lifecycle/` | batch |
| DSR/LGPD pedido titular | `dsr/data-subject-request/` | batch |
| Billing webhook Asaas | `billing/asaas-webhook/` | batch |
| Event Governance | `governance/event-policy-decision/` | batch |
| AIOI correlação | `aioi/correlation-insight/` | batch |

**Runner completo:** `node backend/scripts/audit/e2e_cert_all.js`

**Matriz:** `node backend/scripts/audit/applyCertEvidenceToMatrix.js`

Cada cenário deve conter:
- `request.json`, `response.json` (PII redigido)
- `db_row_*.json` + `db_verify.sql`
- `tenant_isolation.json` (quando aplicável)
- `log_excerpt.txt`, `report.json`, `summary.md`
