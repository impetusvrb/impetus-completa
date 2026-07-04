# SEC-17 — Enterprise Exfiltration Detection & Data Protection

**Módulo:** `backend/src/securityExfiltrationDetection/`  
**Feature flag:** `SECURITY_EXFILTRATION_DETECTION=false` (default)  
**Modo:** `SECURITY_DATA_PROTECTION_MODE=observe`  
**Tipo:** Consultivo e determinístico — **nenhum bloqueio de download**

---

## Missão

Responder com evidências: **houve ou não tentativa de exfiltração?**

Detectar e documentar tentativas de:
- Exfiltração de código e documentação
- Download massivo e scraping automatizado
- Enumeração de ativos críticos
- Movimentação suspeita de dados

---

## Flags

```env
SECURITY_EXFILTRATION_DETECTION=false
SECURITY_DATA_PROTECTION_MODE=observe
SECURITY_EXFILTRATION_REQUIRE_APPROVAL=true
SECURITY_EXFILTRATION_EVAL_MS=60000
```

---

## Endpoint

```
GET /api/audit/security-exfiltration
```

---

## DTO `exfiltration_detection_v1`

| Campo | Descrição |
|-------|-----------|
| `detectionStatus` | CLEAR, MONITORING, SCRAPING_DETECTED, EXPOSURE_ELEVATED, EXFILTRATION_SUSPECTED, EXFILTRATION_LIKELY |
| `exfiltrationConfidence` | 0–1 |
| `scrapingConfidence` | 0–1 |
| `protectedAssets` | Catálogo de ativos estratégicos |
| `suspiciousAssets` | Ativos com acesso suspeito |
| `movementProfile` | Perfil agregado de movimentação |
| `timeline` | Linha temporal forense |
| `evidenceStrength` | Força das evidências |
| `recommendations` | Planos de protecção (`auto_execute: false`) |
| `approvalRequired` | Sempre `true` por defeito |

---

## Teste

```bash
node backend/src/tests/securityExfiltrationDetection/SEC_17_EXFILTRATION_DETECTION.test.js
```

---

*Fecha a lacuna do incidente: inteligência forense robusta antes de contenção activa.*
