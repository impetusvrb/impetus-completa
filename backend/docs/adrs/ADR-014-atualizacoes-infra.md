# ADR-014 — Atualizações Infraestrutura

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01  
**Relacionado:** ADR-007 (ARCHITECTURE)

---

## Contexto

ARCHITECTURE ADR-007 definiu política de update por substituição de `app/`. INFRA-01 detalha procedimento operacional.

---

## Problema

Updates sem runbook padronizado arriscam perda de uploads, estado cognitivo JSON, ou BD inconsistente.

---

## Decisão

**Fluxo contratual:** Pré-update → Backup full → Manutenção → Stop → Replace app → Migrate → Start → Smoke → Go-live ou Rollback.

Volumes `IMPETUS_HOME` excepto `app/` e `temp/` **intocáveis** durante update.

Merge manual de novas vars em `config/.env` — nunca sobrescrever ficheiro completo.

---

## Consequências

- DATA-01 fornece scripts `impetus-backup-pre-update.sh`, `impetus-update.sh`
- VALIDATION-01 valida smoke pós-update

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Update in-place git pull em produção | Sem controle release |
| Migration auto-rollback | Runner proíbe rollback auto prod |
| Blue-green sem volumes partilhados | Complexidade prematura |

---

## Referências

- `backend/scripts/run-all-migrations.js`
- `CERT-ONPREM-INFRA-01.md` Parte 8
