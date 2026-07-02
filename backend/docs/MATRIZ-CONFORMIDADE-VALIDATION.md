# Matriz de Conformidade — Homologação Enterprise

**Certificação:** CERT-ONPREM-VALIDATION-01  
**Execução:** 2026-07-01  
**Decisão:** **NÃO HOMOLOGADA**

---

## Resultado por parte

| Parte | Descrição | Status execução |
|-------|-----------|:---------------:|
| 1 | Auditoria arquitectural | ✅ |
| 2 | Instalação PM2 limpa | ⚠️ |
| 3 | Instalação Docker limpa | ❌ |
| 4 | Equivalência PM2×Docker | ❌ |
| 5 | Persistência | ⚠️ |
| 6 | Backup + restore | ⚠️ (manifest OK pós BACKUP-01; restore físico pendente) |
| 7 | Update A→B | ⚠️ |
| 8 | Rollback | ❌ (ROLLBACK-01 REPROVADA — NC-R001/R002) |
| 9 | Regressão cognitiva | ⚠️ |
| 10 | Segurança operacional | ⚠️ |
| 11 | Performance | ✅ |
| 12 | NCs | ✅ |
| 13 | Decisão | NÃO HOMOLOGADA |

---

## Equivalência PM2 × Docker (Parte 4)

| Capacidade | PM2 (evidência) | Docker | Equivalente |
|------------|:---------------:|:------:|:-----------:|
| server.js via PM2 | ✅ online | ⏳ | — |
| preview:prod | ✅ online | ⏳ | — |
| /health | ✅ 200 | ⏳ | — |
| /api/pulse JWT | ✅ 401 | ⏳ | — |
| Licença | ✅ disabled OK | ⏳ | — |
| IMPETUS_HOME | ⚠️ legacy | ⏳ | — |
| Event Backbone | ⏳ E2E | ⏳ | — |

*Preencher após Parte 3.*

---

## NCs abertas

Ver [`evidence/validation-01/homologation-full-2026-07-01.json`](./evidence/validation-01/homologation-full-2026-07-01.json)

| Severidade | Abertas |
|------------|---------|
| Crítica | 0 |
| Alta | 7 (NC-V006 encerrada; NC-V011 ligada a ROLLBACK-01) |
| Média | 2 |
| Baixa | 1 |

---

## Go-Live checklist

- [ ] Parte 2 VM limpa ✅  
- [ ] Parte 3 Docker ✅  
- [ ] Parte 4 equivalência ✅  
- [ ] Parte 6 backup/restore ✅ (manifest; restore físico via ROLLBACK-01)  
- [ ] Parte 7 update ✅  
- [ ] Parte 8 rollback ✅ (CERT-ENTERPRISE-ROLLBACK-01 aprovada)  
- [ ] Parte 9 cognitivo ✅  
- [ ] Zero NC Alta  

**Go-Live:** ❌ **PROIBIDO**
