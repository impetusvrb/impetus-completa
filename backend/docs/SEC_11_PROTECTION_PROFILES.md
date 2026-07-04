# SEC-11 — Protection Profiles

| Perfil | Endpoints admin | Uploads | Auth | Observabilidade |
|--------|-----------------|---------|------|-----------------|
| NORMAL | full | enabled | standard | normal |
| ELEVATED | monitored | enabled | standard | enhanced |
| DEFENSE | restricted | isolated | strict+captcha | enhanced |
| PROTECTED | minimal | disabled | strict+captcha | enhanced |
| LOCKDOWN | emergency_only | disabled | strict+captcha | enhanced |

---

## Recomendação automática (lógica)

Baseada em: `threatLevel` (SEC-10) · `securityMode` · `runtime_protection_score`

| Input | Perfil recomendado |
|-------|-------------------|
| CRITICAL / PROTECTED | LOCKDOWN |
| HIGH / DEFENSE | PROTECTED |
| MEDIUM / ELEVATED | DEFENSE |
| LOW / MONITORING | ELEVATED |
| runtime_score < 0.5 | DEFENSE |

**Perfil actual vs recomendado** expostos no dashboard — mudança **lógica only**.

---

*Perfis definem planos — não alteram nginx/Express/firewall.*
