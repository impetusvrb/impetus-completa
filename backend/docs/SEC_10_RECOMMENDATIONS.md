# SEC-10 — Recommendations

## Defense Recommendation DTO

```json
{
  "schema_version": "defense_recommendation_v1",
  "priority": "HIGH",
  "attackPattern": "Credential Scan",
  "recommended_actions": [
    { "action": "enable_rate_limiting", "auto_execute": false },
    { "action": "restrict_admin_apis", "auto_execute": false }
  ],
  "auto_execute": false,
  "read_only": true
}
```

---

## Adaptive Surface Actions

| Action | Quando |
|--------|--------|
| `reduce_attack_surface` | CRITICAL |
| `hide_sensitive_endpoints` | Bruteforce / Enumeration |
| `enable_rate_limiting` | Scans LOW+ |
| `enable_captcha` | Bot / Distributed |
| `limit_admin_access` | Credential Scan |
| `isolate_uploads` | Integridade COMPROMISED |
| `restrict_admin_apis` | Credential / API Enum |
| `disable_public_documentation` | Cloud Scanner |

**Todas** com `auto_execute: false`.

---

## SEC-06 integration

SEC-10 **consulta** histórico SEC-06 — não invoca `orchestrateResponse` automaticamente.

---

*Preparação para SEC-11 proteção adaptativa.*
