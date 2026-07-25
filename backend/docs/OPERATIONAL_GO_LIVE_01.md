# OPERATIONAL-GO-LIVE-01 — Enterprise Security Production Readiness & Go-Live Execution

**Fase:** Operacional (não arquitectural — sem SEC-22)  
**Objectivo:** Encerrar ciclo Enterprise Security v2 · sincronizar baseline · promover · observar

## Princípios

- Não altera EG, ECO, Cognitive Core, Enterprise Baseline, módulos SEC-01→21C
- Validar → sincronizar → promover → observar
- **Abortar antes do apply** se qualquer critério falhar

## Comandos

```bash
# Validar tudo sem alterar ambiente
scripts/security/operational-go-live-01.sh --dry-run

# Execução completa (baseline + promoção + guard)
scripts/security/operational-go-live-01.sh --execute

# Etapa isolada
scripts/security/operational-go-live-01.sh --execute --stage 2
```

## Etapas

| # | Etapa | Acção |
|---|-------|-------|
| 1 | Revisão SEC-21B | 7 ficheiros certificados |
| 2 | Baseline sync | `integrity-check.sh --baseline` + `security-baseline-01-collect.sh` |
| 3 | SEC-21C | `SEC_21C_GO_LIVE_VALIDATION.test.js` |
| 4 | Infraestrutura | PM2, nginx, DB, endpoints, rollback |
| 5 | Promoção | `apply-sec21-activation.sh --apply` + PM2 restart |
| 6 | GO_LIVE_GUARD | 5 min + 10 min (enhanced) |
| 7 | Relatório final | `go-live-final-report.json` |

## GO_LIVE_GUARD Enhanced

1. Hashes críticos vs baseline sincronizada (registar, nunca corrigir)
2. Ficheiros inesperados em dirs monitorizados
3. SSH, PID PM2, processos
4. Production Operational Snapshot ao final

## Evidências

`backend/docs/evidence/operational-go-live-01/`

## Sequência

```
SEC-21B ✓ → OPERATIONAL-GO-LIVE-01 → produção real
```

*Última fase antes da operação Enterprise Security v2.*
