# ADR-011 — IMPETUS_HOME

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01  
**Relacionado:** ADR-006 (ARCHITECTURE), ADR-015

---

## Contexto

Estado actual dispersa persistência: `backend/.env`, `backend/uploads`, `/uploads`, `backend/data/`, `backend/backups/`, logs em `/root/.pm2/`. ARCHITECTURE-01 propôs layout `/opt/impetus/`; INFRA-01 formaliza.

---

## Problema

Paths absolutos ligados a `/var/www/impetus-completa` e user root impedem portabilidade, containerização e backup previsível.

---

## Decisão

**`IMPETUS_HOME`** (default `/opt/impetus`) é a raiz oficial com 12 subdirectórios:

`config/`, `app/`, `uploads/`, `logs/`, `database/`, `backups/`, `licenses/`, `certificates/`, `data/`, `temp/`, `scripts/`, `monitoring/`, `runtime/`

Variável de ambiente `IMPETUS_HOME` override permitido.

**Regra de ouro:** dados duráveis **nunca** dentro de `app/`.

---

## Consequências

- DATA-01 implementará symlinks/env para compatibilidade com paths legados
- CONTAINER-01 mapeia cada subdir a volume named
- Instalações existentes migram gradualmente

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Manter paths actuais | Não escala; root dependency |
| Só `/var/lib/impetus` | Menos claro para ops; `/opt` padrão enterprise Linux |
| DB files em `app/` | Viola update sem perda |

---

## Referências

- `CERT-ONPREM-INFRA-01.md` Parte 3
- `backend/src/paths.js`
