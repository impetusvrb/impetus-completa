# ENTERPRISE CONTROLLED RESTART — Plano de Ativação

**Certificação:** PROMOTION-01  
**Tipo:** Procedimento operacional — **apenas feature flags + PM2**  
**Alterações de código:** **Proibidas**

---

## Princípios

1. Actualizar **somente** variáveis de ambiente (feature flags).
2. Restart controlado PM2 com `--update-env`.
3. Preservar: sessões JWT, estado cognitivo em memória (buffers EG), Event Backbone, filas, contexto conversacional.
4. Rollback = reverter flags + restart.
5. **Grupo A apenas** neste plano (camadas cognitivas EG-12→19).

---

## Pré-requisitos

- [ ] EG-20 certificado
- [ ] INTEG-01 certificado
- [ ] PROMOTION-01 **READY COM RESSALVAS** aprovado
- [ ] Backup `.env` actual (`cp backend/.env backend/.env.pre-promotion-$(date +%Y%m%d)`)
- [ ] `pm2 status` — `impetus-backend` online, restarts estáveis
- [ ] Suite EG-20 regressão executada nas últimas 24h

---

## Sequência oficial de promoção (Grupo A)

| Ordem | Flag | Risco | Rollback |
|-------|------|-------|----------|
| 0 | `EVENT_GOVERNANCE_AIOI=true` | Baixo — feed já no pipeline | `=false` + restart |
| 1 | `EVENT_GOVERNANCE_LEARNING=true` | Baixo — registo passivo | `=false` + restart |
| 2 | `EVENT_GOVERNANCE_MEMORY=true` | Baixo — lookup + registo | `=false` + restart |
| 3 | `EVENT_GOVERNANCE_EXPLAINABILITY=true` | Baixo — enrich interno | `=false` + restart |
| 4 | `EVENT_GOVERNANCE_INTELLIGENCE=true` | Médio — snapshots + recomendações | `=false` + restart |
| 5 | `EVENT_GOVERNANCE_POLICY_OPTIMIZATION=true` | Médio — análise políticas | `=false` + restart |
| 6 | `EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS=true` | Baixo — on-demand audit | `=false` + restart |
| 7 | `EVENT_GOVERNANCE_KNOWLEDGE_BASE=true` | Baixo — on-demand audit | `=false` + restart |

**Recomendação operacional:** activar **todas as flags Grupo A num único restart** após validação em staging, para evitar múltiplos ciclos de restart em produção.

---

## Procedimento — Staging (recomendado primeiro)

```bash
# 1. Backup env
cp /var/www/impetus-completa/backend/.env \
   /var/www/impetus-completa/backend/.env.pre-promotion-$(date +%Y%m%d%H%M)

# 2. Activar Grupo A (editar .env ou export)
# EVENT_GOVERNANCE_AIOI=true
# EVENT_GOVERNANCE_LEARNING=true
# EVENT_GOVERNANCE_MEMORY=true
# EVENT_GOVERNANCE_EXPLAINABILITY=true
# EVENT_GOVERNANCE_INTELLIGENCE=true
# EVENT_GOVERNANCE_POLICY_OPTIMIZATION=true
# EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS=true
# EVENT_GOVERNANCE_KNOWLEDGE_BASE=true

# 3. Controlled restart (preserva env injectado)
cd /var/www/impetus-completa
pm2 restart impetus-backend --update-env

# 4. Validar saúde
curl -s http://127.0.0.1:4000/health | jq .
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:4000/api/audit/event-governance/learning | jq .enabled
```

---

## Procedimento — Produção

```bash
# Mesma sequência após homologação staging
pm2 restart impetus-backend --update-env

# Opcional: reload zero-downtime (se cluster futuro)
# pm2 reload impetus-backend --update-env
```

**Não reiniciar** `impetus-frontend` para promoção Grupo A (sem dependência frontend).

---

## Validação pós-restart (PARTE 5)

| Check | Endpoint / evidência | Esperado |
|-------|---------------------|----------|
| Learning activo | `GET /api/audit/event-governance/learning` | `enabled: true` |
| Memory activa | `GET /api/audit/event-governance/memory` | `enabled: true` |
| Explainability activa | `GET /api/audit/event-governance/explainability` | `enabled: true` |
| Intelligence activa | `GET /api/audit/event-governance/intelligence` | `enabled: true` |
| Policy Optimization | `GET /api/audit/event-governance/policy-optimization` | `enabled: true` |
| Executive Insights | `GET /api/audit/event-governance/executive-insights` | `enabled: true` |
| Knowledge Base | `GET /api/audit/event-governance/knowledge-base` | `enabled: true` |
| Métricas | `observabilityService` / deep health | sem pico `errors_count` |
| Pipeline intacto | Disparar evento teste governado | sem alteração matching |

---

## Rollback

```bash
# Restaurar .env backup
cp /var/www/impetus-completa/backend/.env.pre-promotion-YYYYMMDDHHMM \
   /var/www/impetus-completa/backend/.env

# Ou desactivar flags Grupo A individualmente
# EVENT_GOVERNANCE_LEARNING=false
# ... (repetir para cada flag)

pm2 restart impetus-backend --update-env
```

**Tempo estimado de rollback:** < 2 minutos.

---

## O que NÃO activar neste restart

| Flag / componente | Motivo |
|-------------------|--------|
| `EVENT_GOVERNANCE_ENABLED` | Migração núcleo — ciclo separado |
| `EVENT_GOVERNANCE_EXECUTION_ENABLED` | Execução real — requer validação domínio |
| `EVENT_GOVERNANCE_OPERATIONAL_ALERTS` etc. | Domínios BLOCKED (NC-INT-004/007) |
| Grupo B (Pulse, Controller, Backbone) | NOT ELIGIBLE — integração futura |

---

## Preservação de estado

| Recurso | Impacto do restart |
|---------|-------------------|
| Sessões JWT | Preservadas (stateless) |
| Buffers EG in-memory | **Reiniciados** — esperado; re-populam com tráfego |
| Event Backbone / filas | Preservados (processo separado / persistência existente) |
| PostgreSQL | Sem migração nesta fase |
| PM2 restarts counter | Incrementa +1 — monitorizar |

---

## Critérios de sucesso

- [ ] Todas as flags Grupo A `true` no processo PM2
- [ ] 7 endpoints audit reportam `enabled: true`
- [ ] Sem regressão em `GET /health` e deep health
- [ ] EG-20 critérios ainda válidos (código inalterado)
- [ ] Rollback testado em staging
