# Voice Shadow Observability — Fase 37-C

**Data:** 2026-06-01  
**Janela:** últimos **7 dias**  
**Fonte:** `audit_logs` WHERE `action = 'voice_truth_shadow'`

---

## Métricas

| Métrica | Valor |
|---------|-------|
| **Total eventos** | **4** |
| **would_replace = true** | **4** (100%) |
| **would_block = true** | **4** (100%) |
| **Confiança média** | **0,28** |
| Primeiro evento | 2026-06-01T13:29:48Z |
| Último evento | 2026-06-01T14:11:35Z |

---

## Critério F36/F37

| Critério | Meta | Resultado |
|----------|------|-----------|
| Eventos ≥ 200 (7 dias) | ≥ 200 | **NÃO** (4) |
| Shadow operacional em runtime | HTTP 200 | **SIM** (validado F36) |
| Enforcement oral activo | Não | **Não** (correcto) |

---

## Distribuição esperada vs observada

- Amostra concentrada no **mesmo dia** (certificação F35/F36 + testes manuais).
- **Não há volume estatístico** para decisão de promoção voice → enforce.
- Em tenant com PLC (`find fish`), shadow com frase «OEE 87%» → `would_replace: true`, `action: replace_no_data` (F36).

---

## Query de reprodução

```sql
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE (description::jsonb->>'would_replace')::boolean IS TRUE) AS would_replace,
  COUNT(*) FILTER (WHERE (description::jsonb->>'would_block')::boolean IS TRUE) AS would_block,
  ROUND(AVG((description::jsonb->>'confidence')::float)::numeric, 4) AS avg_confidence
FROM audit_logs
WHERE action = 'voice_truth_shadow'
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## Veredito 37-C

| Classificação | **SHADOW CERTIFIED — OBSERVABILITY INSUFFICIENT** |
|---------------|-----------------------------------------------------|
| Runtime / rota | VERIFIED |
| Volume estatístico (≥200) | **NOT MET** |
| Promoção enforcement oral | **NÃO RECOMENDADA** nesta janela |

**Acção:** manter shadow; continuar coleta orgânica via Anam/OpenAI Realtime durante 7 dias corridos com uso real.
