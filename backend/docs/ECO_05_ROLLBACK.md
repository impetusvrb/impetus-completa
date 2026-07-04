# ECO-05 — Rollback Pulse Consumer

**Fase:** 5 · **Data:** 2026-07-02

---

## Rollback independente

| Flag | Acção | Impacto |
|------|-------|---------|
| `ECO_PULSE_VIA_EG=false` | PM2 restart `--update-env` | Volta shadow; Pulse analytics próprios |

**Não afecta:** `ECO_OAE_VIA_EG`, `ECO_CHAT_VIA_EG`, `ECO_ORG_AI_VIA_EG`, `ECO_CONTROLLER_VIA_EG`

---

## Procedimento

```bash
sed -i 's/ECO_PULSE_VIA_EG=true/ECO_PULSE_VIA_EG=false/' backend/.env
pm2 restart impetus-backend --update-env
curl -H "Authorization: Bearer $TOKEN" https://HOST/api/audit/eco-pulse/status
```

---

## Quando rollback

| Condição | Acção |
|----------|-------|
| Dashboard perde informação Pulse | Rollback imediato |
| Divergência shadow > 20% sustentada | Manter OFF |
| Latência executive dashboard > 2× baseline | Rollback |
| Regressão pulse_index / domain_states | Rollback |

---

## Backup pré-activação

```bash
cp backend/.env backend/.env.pre-eco05-pulse-$(date +%s)
```

---

## Ordem staging recomendada

1. ECO-03 flags (uma a uma, 7d cada)
2. ECO-04 Controller (7d)
3. ECO-05 Pulse (7d)
4. Monitorar `/api/audit/eco-pulse/status`
