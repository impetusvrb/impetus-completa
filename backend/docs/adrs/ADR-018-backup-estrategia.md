# ADR-018 — Estratégia de Backup

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01  
**Relacionado:** ADR-015, ADR-019

---

## Contexto

Actual: `backup-db-before-manuia.sh` manual → `backend/backups/`. Sem backup uploads/data/config automatizado. Sem restore script.

---

## Problema

Enterprise industrial exige RPO/RTO definidos e escopo backup completo.

---

## Decisão

**Escopo backup obrigatório:**

- PostgreSQL (`pg_dump -Fc`)
- `uploads/`
- `data/` (estado cognitivo)
- `config/` (encriptado)
- `licenses/`

**Frequência contratual:** diário + pré-update; retenção 30d local.

**Destino:** `${IMPETUS_HOME}/backups/` + replica off-site.

**Incremental:** uploads/data via rsync/tar delta (DATA-01).

Script existente `backup-db-before-manuia.sh` evolui para suite DATA-01 — não alterado nesta cert.

---

## Consequências

- RPO ≤ 24h (contrato)
- Implementação scripts em DATA-01

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Só backup BD | Perde uploads e JSON cognitivo |
| Backup cloud IMPETUS obrigatório | Viola on-prem |

---

## Referências

- `backend/scripts/backup-db-before-manuia.sh`
- CERT-ONPREM-INFRA-01 Parte 9
