# SEC-05 — Enterprise Security Notification Center

**Fase:** SEC-05  
**Modo:** Notification only — zero auto-response/remediação  
**Feature flag:** `SECURITY_NOTIFICATION_CENTER=false` (default)

---

## Propósito

Responder **"Quem precisa ser avisado, quando e por quê?"** — Centro de Comando de Incidentes com contexto completo para decisão humana.

Consome read-only: SEC-02 (incidentes), SEC-03 (threat intelligence), SEC-04 (integridade).

---

## Activação

```bash
SECURITY_OBSERVATORY=true
SECURITY_CORRELATION_ENGINE=true
SECURITY_THREAT_INTELLIGENCE=true
SECURITY_RUNTIME_INTEGRITY=true
SECURITY_NOTIFICATION_CENTER=true

pm2 restart impetus-backend --update-env
```

---

## Endpoints

```
GET /api/audit/security-notifications
GET /api/audit/security-notifications/pending
Authorization: Bearer <tenant_admin>
```

---

## Command Center (cada notificação inclui)

- Classificação do incidente
- Confiança da análise
- Impacto potencial
- Ativos afectados
- Timeline do incidente
- Evidências (refs)
- Recomendações
- Responsável sugerido

---

## Agregação

23.000 eventos → 1 incidente (SEC-02) → **1 notificação consolidada** (dedup 1h).

---

## Canais (fase actual)

Console, Audit Endpoint, Log estruturado, Webhook interno (opcional).  
Adapters desacoplados: Email, Push, SMS (skipped — sem envio externo).
