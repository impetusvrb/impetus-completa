# Manual — Go-Live Enterprise (Liberação Oficial)

**Certificação:** CERT-ENTERPRISE-GOLIVE-01  
**Audiência:** Produto, Arquitetura, Ops, Segurança, liderança

---

## 1. Propósito

Este manual define o **processo de liberação formal** da versão IMPETUS Enterprise On-Premise para distribuição a clientes.

- **Não substitui** homologação (`VALIDATION-01`)
- **Não autoriza** Go-Live por si só — exige decisão multi-área
- Complementa `MANUAL-GO-LIVE.md` (checklist operacional legado)

---

## 2. Quando usar

Execute este fluxo **apenas** quando as 3 fases operacionais estiverem concluídas:

| Fase | Certificação | Resultado exigido |
|------|--------------|-------------------|
| 1 | STAGING-01 | APROVADA |
| 2 | ROLLBACK-01 | APROVADA |
| 3 | VALIDATION-01 | HOMOLOGADA |

Se qualquer fase falhar → **não avançar** para GOLIVE. Abrir NC; certificação corretiva **só se defeito de produto**.

---

## 3. Documentos do pacote Go-Live

| Documento | Função |
|-----------|--------|
| `CERT-ENTERPRISE-GOLIVE-01.md` | Critérios oficiais |
| `CHECKLIST-GOLIVE.md` | Verificação item a item |
| `GO-LIVE-DECISION-RECORD.md` | Decisão + NCs + assinaturas |
| `MANUAL-GO-LIVE.md` | Checklist operacional cliente |

---

## 4. Fluxo de decisão

```
1. Confirmar STAGING + ROLLBACK + VALIDATION aprovadas
2. Preencher CHECKLIST-GOLIVE.md (todas as secções)
3. Actualizar matriz NC em GO-LIVE-DECISION-RECORD.md
4. Obter 6 aprovações (Arquitetura, Infra, Dev, Ops, Segurança, Produto)
5. Se 6/6 + zero NC Alta (ou aceite formal) → AUTORIZADO
6. Arquivar evidências em evidence/golive-01/
7. Comunicar cliente / distribuição
```

---

## 5. Critérios bloqueantes

| Condição | Efeito |
|----------|--------|
| VALIDATION não HOMOLOGADA | Go-Live **PROIBIDO** |
| ROLLBACK não APROVADA | Go-Live **PROIBIDO** |
| STAGING não APROVADA | Go-Live **PROIBIDO** |
| NC Crítica aberta | Go-Live **PROIBIDO** |
| NC Alta aberta sem aceite | Go-Live **PROIBIDO** |
| Qualquer área **Reprova** | Go-Live **PROIBIDO** |

---

## 6. Validação técnica final

Na VM staging homologada (ou réplica produção cliente):

```bash
export IMPETUS_HOME=/opt/impetus
cd /opt/impetus/app/backend

npm run enterprise:homologation -- --json
node scripts/enterprise/verify-enterprise.js
node scripts/enterprise/health-enterprise.js
npm run test:license-enterprise
```

Todos devem passar com evidência arquivada.

---

## 7. Entregáveis ao cliente (pós-autorização)

- `HANDOFF-INFRASTRUCTURE.md` preenchido
- Manuais: BACKUP, RESTORE, ROLLBACK, UPDATE, LICENSING, DOCKER/PM2
- Licença + `public.pem`
- Tag release e notas de versão
- Contacto suporte

---

## 8. Pós Go-Live (48–72h)

- Monitorizar PM2 / logs
- Confirmar backup diário
- Alertas licença (grace / expiring)
- Canal suporte activo

---

## 9. Encerramento do ciclo Enterprise v1

Quando GOLIVE emitir **AUTORIZADO**:

- Ciclo de certificações Enterprise **v1 encerrado**
- Evoluções futuras → **Enterprise v2** ou nova rodada de certificações
- Não estender indefinidamente o plano actual

---

## 10. Estado actual

| Item | Valor |
|------|-------|
| GOLIVE-01 estrutura | ✅ PREPARADA |
| Go-Live autorizado | ❌ **PROIBIDO** |
| Próxima fase | STAGING-01 execução |

---

## Referências

- `CERT-ONPREM-VALIDATION-01.md`
- `CERT-ENTERPRISE-PROVISIONING-01.md`
- `MANUAL-HOMOLOGACAO.md`
