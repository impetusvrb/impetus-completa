# APPSEC-02A — Enterprise Operational Hardening & External Red Team Readiness

**Programa:** APPSEC-02A  
**Data:** 2026-07-04  
**Tipo:** Fase operacional (estilo OPERATIONAL-GO-LIVE-01)  
**Valida:** APPSEC-02 + ambiente de produção (não altera)

---

## Objetivo

Preparar oficialmente o IMPETUS para **validação externa de segurança** (Red Team independente), eliminando risco residual **operacional** identificado no APPSEC-02.

**Não implementa novos mecanismos de segurança.**  
**Não altera SEC-01→SEC-21C, APPSEC-01 nem APPSEC-02.**

---

## Módulo

`backend/src/securityOperationalReadiness/`

| Componente | Função |
|------------|--------|
| `secretCleanupEngine.js` | Inventário `.env` / backups; plano de limpeza |
| `runtimeConfigurationReadiness.js` | Validação config runtime (CRITICAL→LOW) |
| `dependencyUpgradePlanner.js` | Plano oficial de upgrades npm |
| `runtimeRestartValidator.js` | Snapshots pré/pós restart |
| `confidenceLevelEngine.js` | Confidence Level 0–100% por finding |
| `externalRedTeamReadiness.js` | Decisão formal de readiness |
| `operationalReadinessOrchestrator.js` | Orquestração + evidências JSON |

---

## Execução

```bash
# Suíte completa
node backend/src/tests/securityOperationalReadiness/APPSEC_02A.test.js

# Bundle + evidências
node -e "require('./src/securityOperationalReadiness').buildReadiness({persist:true}).then(b=>console.log(b.external_redteam_readiness.decision))"

# Inventário secrets (dry-run)
backend/scripts/security/cleanup-env-artifacts.sh --dry-run

# API (admin tenant)
GET /api/audit/appsec-operational-readiness
GET /api/audit/appsec-operational-readiness?refresh=true
GET /api/audit/appsec-operational-readiness?refresh=true&unsafe_acknowledged=true
```

Evidências: `backend/docs/evidence/appsec-02a/readiness-latest.json`

---

## Decisões possíveis

| Decisão | Critério |
|---------|----------|
| `READY_FOR_EXTERNAL_RED_TEAM` | Overall ≥85%, ops ≥75%, security ≥90%, zero CRITICAL runtime |
| `READY_WITH_REMARKS` | Overall ≥65%, security ≥80%, ressalvas documentadas |
| `NOT_READY` | CRITICAL runtime, APPSEC_FAILED, ou scores abaixo dos limiares |

---

## Restrições

- SEC-01→SEC-21C: inalterado
- APPSEC-01 / APPSEC-02: inalterados (só consumidos)
- Event Governance, ECO, Cognitive Core: inalterados
- Nenhuma remoção automática de `.env` ou correção automática de config

---

## Documentação relacionada

- [`APPSEC_02A_OPERATIONAL_READINESS.md`](./APPSEC_02A_OPERATIONAL_READINESS.md)
- [`APPSEC_02A_SECRET_CLEANUP.md`](./APPSEC_02A_SECRET_CLEANUP.md)
- [`APPSEC_02A_DEPENDENCY_PLAN.md`](./APPSEC_02A_DEPENDENCY_PLAN.md)
- [`APPSEC_02A_RUNTIME_VALIDATION.md`](./APPSEC_02A_RUNTIME_VALIDATION.md)
- [`APPSEC_02A_CONFIDENCE_LEVEL.md`](./APPSEC_02A_CONFIDENCE_LEVEL.md)
- [`APPSEC_02A_REPORT.md`](./APPSEC_02A_REPORT.md)

---

## Próximo passo

Após `READY_FOR_EXTERNAL_RED_TEAM` ou `READY_WITH_REMARKS` com acções operacionais concluídas: **Red Team externo independente**, repetindo e ampliando o roteiro de 04/07/2026.
