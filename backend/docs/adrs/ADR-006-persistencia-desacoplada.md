# ADR-006 — Persistência Desacoplada do Container/Processo

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Relacionado:** ADR-007

---

## Contexto

Actualmente o IMPETUS persiste dados em paths dispersos: `backend/.env`, `uploads/`, `backend/uploads/`, `backend/data/`, logs PM2 em `/root/.pm2/logs/`, PostgreSQL externo. A auditoria forense classificou Docker readiness como VERMELHO — sem imagem app e com paths absolutos no host.

Enterprise On-Premise adoptará PM2-first (INFRA-01); containerização futura é possível mas **não faz parte desta certificação**.

---

## Problema

Como garantir que actualizações, restarts e eventual containerização futura **não destruam estado**?

---

## Decisão

Definir **layout canónico de persistência** em `IMPETUS_HOME` (default `/opt/impetus/`), com separação estrita:

```
config/  uploads/  logs/  database/  backups/  temp/  certificates/  licenses/  data/  app/
```

**Regra:** Nenhum artefacto durável reside dentro de `app/` (código versionado). Processo (PM2) e eventual container são **efémeros** relativamente aos volumes.

Variável canónica futura: `IMPETUS_HOME` (INFRA-01 implementará redireccionamento de paths).

---

## Consequências

### Positivas

- Updates substituem apenas `app/`
- Backup/restore previsível (DATA-01)
- Preparação para volumes Docker futuros sem redesign
- Licença e certificados isolados

### Negativas

- Migração de instalações existentes requer remapeamento de paths (INFRA-01)
- Duas raízes uploads actuais devem convergir

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Persistência dentro do repo git | Mistura código e dados; inseguro |
| Só PostgreSQL (sem uploads/data/) | Perda de ficheiros e estado JSON cognitivo |
| Blob storage cloud obrigatório | Viola on-prem |
| Docker volumes sem layout definido | Caos operacional |

---

## Referências

- `backend/src/paths.js`
- CERT-ONPREM-FORENSICS-01, Parte 9
- CERT-ONPREM-ARCHITECTURE-01, Parte 5
