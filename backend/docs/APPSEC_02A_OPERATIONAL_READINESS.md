# APPSEC-02A — Operational Readiness

**Programa:** APPSEC-02A · Parte operacional  
**Modelo:** OPERATIONAL-GO-LIVE-01 (validar → documentar → decidir)

---

## Princípios

1. **Read-only** — nenhuma alteração automática em produção
2. **Auditável** — JSON em `docs/evidence/appsec-02a/`
3. **Reversível** — scripts com `--dry-run`, `--apply`, `--rollback`
4. **Desacoplado** — módulo `securityOperationalReadiness/` isolado de SEC e APPSEC

---

## Dimensões de readiness

| Dimensão | Peso no overall | Fonte |
|----------|-----------------|-------|
| Operational Readiness | 35% | Secrets, runtime config, restart snapshot |
| Security Readiness | 40% | Reexecução APPSEC-02, regressões, P0/P1 |
| Application Readiness | 25% | Plano deps, confidence aggregate |
| Residual Risk | informativo | APPSEC-02 scores |

---

## Orquestrador

`operationalReadinessOrchestrator.js` executa em sequência:

1. `generateSecretCleanupReport`
2. `validateRuntimeConfigurationReadiness`
3. `generateDependencyUpgradePlan`
4. `validateRestartReadiness`
5. Reexecução APPSEC-02 via `securityApplicationValidation.runValidation`
6. `generateConfidenceReport`
7. `evaluateExternalRedTeamReadiness`

---

## Evidências geradas

| Ficheiro | Conteúdo |
|----------|----------|
| `readiness-latest.json` | Bundle completo |
| `secret-cleanup-report.json` | Inventário `.env` |
| `runtime-readiness.json` | Findings config |
| `dependency-plan.json` | Plano npm |
| `restart-validation.json` | Snapshots runtime |
| `confidence-level.json` | Findings + % |
| `external-redteam-readiness.json` | Decisão formal |
| `appsec02-rerun.json` | Resumo APPSEC-02 |

---

## Acções operacionais pendentes (típicas)

- Remover/arquivar backups `.env` UNSAFE após rotação de segredos
- Corrigir flags produção (`LICENSE_VALIDATION_ENABLED`, etc.)
- Executar upgrades P0 (axios, ws) em staging com regressão
- `pm2 restart impetus-backend --update-env` após alterações

---

## Comando

```bash
node backend/src/tests/securityOperationalReadiness/APPSEC_02A.test.js
```
