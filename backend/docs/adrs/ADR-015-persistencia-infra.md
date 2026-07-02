# ADR-015 — Persistência Infraestrutura

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01  
**Relacionado:** ADR-006, ADR-011

---

## Contexto

Duas raízes uploads, estado cognitivo em `backend/data/<uuid>/`, config em `backend/.env`. Container futuro exige volumes explícitos.

---

## Problema

Persistência inconsistente impede backup, DR e containerização.

---

## Decisão

Classificação oficial IMPETUS_HOME:

| Classe | Pastas | Política |
|--------|--------|----------|
| **Crítica** | database/, uploads/, data/, config/, licenses/ | Backup obrigatório; sobrevive update |
| **Operacional** | logs/, backups/, certificates/ | Backup recomendado |
| **Efémera** | temp/, runtime/ | Limpeza automática |
| **Substituível** | app/, scripts/ | Replace por release |

Redireccionamento legado via `UPLOADS_DIR`, `IMPETUS_DATA_DIR` (DATA-01).

---

## Consequências

- CONTAINER-01: 1 volume por classe crítica mínimo
- Estado cognitivo: `${IMPETUS_HOME}/data/<company_id>/`

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Estado cognitivo só PG | Código actual usa JSON files |
| Uploads em object storage cloud | Viola on-prem default |

---

## Referências

- `backend/data/`, `paths.js`
- CERT-ONPREM-INFRA-01 Parte 3
