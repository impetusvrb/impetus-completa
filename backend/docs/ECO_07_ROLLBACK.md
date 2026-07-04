# ECO-07 — Rollback Executive Consumer

**Fase:** 7 · **Data:** 2026-07-02

---

## Rollback independente

| Acção | Efeito | Impacto |
|-------|--------|---------|
| `ECO_EXECUTIVE_VIA_EG=false` | PM2 restart `--update-env` | Volta shadow; KPIs locais |

**Não afecta:** `ECO_OAE_VIA_EG`, `ECO_CHAT_VIA_EG`, `ECO_ORG_AI_VIA_EG`, `ECO_CONTROLLER_VIA_EG`, `ECO_PULSE_VIA_EG`, `ECO_CONTEXT_VIA_EG`

---

## Procedimento

```bash
sed -i 's/ECO_EXECUTIVE_VIA_EG=true/ECO_EXECUTIVE_VIA_EG=false/' backend/.env
pm2 restart impetus-backend --update-env
```

Verificar:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://HOST/api/audit/eco-executive/status | jq '.shadow_mode'
# true
```

---

## Comportamento pós-rollback

| Aspecto | Estado |
|---------|--------|
| Pulse domain_states | Inalterado |
| Boardroom centers/widgets | Inalterado |
| executive_kpis EG | Desactivado (shadow only) |
| Executive Insights core | Inalterado |

---

## Re-activação

1. Validar shadow KPI match ≥85% em staging
2. Activar `ECO_EXECUTIVE_VIA_EG=true` (1 restart)
3. Monitorizar `GET /api/audit/eco-executive/status`
