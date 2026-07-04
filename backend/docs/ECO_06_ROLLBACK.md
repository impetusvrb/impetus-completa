# ECO-06 — Rollback Conversation Context Consumer

**Fase:** 6 · **Data:** 2026-07-02

---

## Rollback independente

| Acção | Efeito | Impacto |
|-------|--------|---------|
| `ECO_CONTEXT_VIA_EG=false` | PM2 restart `--update-env` | Volta shadow; prompt sem KB |

**Não afecta:** `ECO_OAE_VIA_EG`, `ECO_CHAT_VIA_EG`, `ECO_ORG_AI_VIA_EG`, `ECO_CONTROLLER_VIA_EG`, `ECO_PULSE_VIA_EG`

---

## Procedimento

```bash
sed -i 's/ECO_CONTEXT_VIA_EG=true/ECO_CONTEXT_VIA_EG=false/' backend/.env
pm2 restart impetus-backend --update-env
```

Verificar:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://HOST/api/audit/eco-context/status | jq '.shadow_mode'
# true
```

---

## Comportamento pós-rollback

| Aspecto | Estado |
|---------|--------|
| Classificação CCE | Inalterada |
| Perfil conversacional | Inalterado |
| Prompt KB enrich | Desactivado |
| Shadow compare | Continua (observacional) |
| Event Governance | Inalterado |
| Knowledge Base core | Inalterado |

---

## Re-activação

1. Validar shadow em staging (divergências documentadas)
2. Activar `ECO_CONTEXT_VIA_EG=true` (1 restart)
3. Monitorizar `GET /api/audit/eco-context/status` — `knowledge_reused`, latência

---

## Código

Remover integração (último recurso — preferir flag):

- `conversationContextEngine.js` — bloco `processConversationKnowledge`
- Adapter permanece deployado (inactivo com flag OFF)
