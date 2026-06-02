# Voice Shadow Validation — Fase 36-C

**Data:** 2026-06-01  
**Rota:** `POST /api/dashboard/voice-truth-shadow-validate`  
**Estado:** **SHADOW CERTIFIED** (runtime activo; enforcement oral não activado)

---

## Diagnóstico F35 → F36

| Item | F35 | F36 |
|------|-----|-----|
| HTTP na API | **404** (PM2 sem reload) | **200** após `pm2 reload impetus-backend` |
| Código no repo | Presente | Inalterado (F34) |
| Serviço | `assessVoiceTranscriptShadow` | Operacional |

**Causa do 404:** processo Node em produção não tinha a rota registada até reload — não era ausência de implementação.

---

## Validação executada (2026-06-01)

```json
{
  "status": 200,
  "assistant_text": "O OEE hoje está em 87%",
  "query_text": "OEE hoje",
  "assessment": {
    "would_replace": true,
    "would_block": true,
    "action": "replace_no_data",
    "mode": "enforce",
    "evidence_binding": { "confidence": "no_operational_data" }
  }
}
```

Tenant: Fresh & Fit vazio (`511f4819-fc48-479e-b11e-49ba4fb9c81b`).

Audit: `audit_logs.action = 'voice_truth_shadow'` (gravado em cada chamada shadow).

---

## Frontend (sem alteração UX F36)

- `frontend/src/services/anamPanelBridge.js`
- `frontend/src/hooks/useVoiceEngine.js`

Continuam a reportar shadow; **não** bloqueiam áudio.

---

## Meta de coleta (7 dias)

| Métrica | Alvo | Estado actual |
|---------|------|---------------|
| Eventos `voice_truth_shadow` | ≥ 200 | Baixo em produção (depende de uso Anam) |
| `would_replace` / `would_block` | Monitorizar | Funcional em teste |
| Decisão enforcement oral | Após coleta | **Não decidido** — fora de F36 |

Query SQL:

```sql
SELECT COUNT(*), AVG((description::jsonb->>'confidence')::float)
FROM audit_logs
WHERE action = 'voice_truth_shadow'
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## Veredito

**Voice = SHADOW CERTIFIED** — rota e serviço validados em runtime; promoção a enforcement oral requer janela de observação, não activada nesta fase.
