# SECURITY CERTIFICATION REPORT

**Última actualização:** SEC-20 — Enterprise Security v2  
**Programa:** Enterprise Security v1 + v2

**Dossiê de incidentes:** [`security/incident-knowledge-base/INCIDENT_FINAL_REPORT.md`](./security/incident-knowledge-base/INCIDENT_FINAL_REPORT.md)

---

## v1 (SEC-08)

| Item | Valor |
|------|-------|
| Decisão | CERTIFIED WITH REMARKS |
| Fases | SECURITY-BASELINE-01 → SEC-07 |
| Evidência | `evidence/sec-08/certification-latest.json` |

---

## v2 (SEC-20)

| Item | Valor |
|------|-------|
| Decisão | Ver `evidence/sec-20/certification-latest.json` |
| Fases | SECURITY-BASELINE-01 → SEC-19 |
| Regressão | SEC-01→SEC-19 (100% PASS requerido) |
| Evidência consolidada | `evidence/sec-20/` |

## SEC-21 — Activação operacional

| Item | Valor |
|------|-------|
| Decisão | ONLINE / ACTIVE / OPERATIONAL |
| Evidência | `evidence/sec-21/activation-latest.json` |
| Rollback | `evidence/sec-21/rollback-env.snapshot.json` |
| Comando | `node backend/src/tests/audit/SEC_21_PRODUCTION_ACTIVATION.test.js` |
| Deploy produção | `scripts/security/apply-sec21-activation.sh --apply` |

## SEC-21A — Go-Live Gate

| Item | Valor |
|------|-------|
| Decisão | Ver `evidence/sec-21a/go-live-latest.json` |
| Comando | `node backend/src/tests/audit/SEC_21A_PRODUCTION_GO_LIVE_GATE.test.js` |
| Endpoint | `GET /api/audit/security-go-live-gate` |
| Obrigatório antes de `--apply` | Sim (salvo `SEC21_FORCE_APPLY=1`) |

## SEC-21B — Baseline Synchronization

| Item | Valor |
|------|-------|
| Decisão | Ver `evidence/sec-21b/synchronization-latest.json` |
| Comando | `node backend/src/tests/audit/SEC_21B_BASELINE_SYNCHRONIZATION.test.js` |
| Endpoint | `GET /api/audit/security-baseline-synchronization` |
| Actualiza manifest | **Não** (manual após aprovação) |

## SEC-21C — Go-Live Validation (autorização final)

| Item | Valor |
|------|-------|
| Decisão | Ver `evidence/sec-21c/go-live-validation-latest.json` |
| Comando | `node backend/src/tests/audit/SEC_21C_GO_LIVE_VALIDATION.test.js` |
| Endpoint | `GET /api/audit/security-go-live-validation` |
| Obrigatório antes de `--apply` | **Sim** (substitui SEC-21A como gate final) |

### Pacote de evidências v2

- `certification-latest.json`
- `criteria.json`
- `regression-summary.json`
- `operational-readiness.json`

---

## NCs remanescentes

Registadas em `evidence/sec-20/certification-latest.json` → campo `ncs`

| ID | Severidade | Tema |
|----|------------|------|
| NC-SEC20-002 | Baixa | Flags OFF em produção (shadow by design) |
| NC-SEC20-003 | Média | Stress HTTP real pendente em staging |

---

*Relatório consolidado v1 + v2.*
