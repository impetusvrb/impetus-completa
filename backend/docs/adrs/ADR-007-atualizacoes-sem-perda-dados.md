# ADR-007 — Atualizações sem Perda de Dados

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Relacionado:** ADR-006

---

## Contexto

O IMPETUS possui runner de migrations forward-only maduro (`run-all-migrations.js`) com histórico, checksum e denylist de operações destrutivas. Instalações Enterprise receberão updates periódicos de código e schema.

---

## Problema

Como actualizar versões IMPETUS On-Premise preservando banco, uploads, logs, licença, configuração e backups — sem regressão cognitiva?

---

## Decisão

Adoptar **política de actualização por substituição de código** com **volumes persistentes intactos**:

### Pré-condições (obrigatórias)

1. Backup completo: `database/` + `uploads/` + `config/` + `data/` + `licenses/`
2. Verificação versão (`build-meta.json`)
3. Modo manutenção

### Execução

1. Parar PM2
2. Substituir `app/` (release tag)
3. `npm ci --production` (backend)
4. `run-all-migrations.js` (forward-only)
5. Merge manual de novas vars em `config/.env`
6. Reiniciar PM2 + smoke test

### Rollback

- Restaurar `app/` versão anterior
- Restaurar BD se migration irreversível aplicada

### Proibições

- Migrations rollback automático em produção
- Sobrescrever `config/.env` sem merge
- Update sem backup

---

## Consequências

### Positivas

- Dados do cliente nunca no tarball de release
- Mesmo processo servirá SaaS e Enterprise
- Alinhado com migration governance existente

### Negativas

- Merge manual de env em cada update
- Rollback de BD manual (lacuna actual — DATA-01)

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Blue-green com BD separado | Complexidade excessiva para fábrica única |
| Migrations automáticas sem backup | Risco de perda de dados |
| Reinstalação limpa por update | Inaceitável para produção industrial |
| Container rolling update sem ADR-006 | Paths não preparados |

---

## Referências

- `backend/scripts/run-all-migrations.js`
- `backend/scripts/ops/install-industrial.sh`
- CERT-ONPREM-FORENSICS-01, Parte 5
