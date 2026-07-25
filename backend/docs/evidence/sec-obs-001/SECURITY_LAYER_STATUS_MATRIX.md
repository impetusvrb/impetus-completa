# SEC-OBS-001 — Matriz de Estado das Camadas

**Data:** 2026-07-23  
**Painel:** Camadas de Proteção (inteligência por `country_code`)  
**Pós-correção:** sim (RATE_LIMIT)

---

## Legenda

| Código | UI típica |
|--------|-----------|
| ATUOU | Actuou |
| OBSERVADA | Observada |
| SEM_TELEMETRIA | Sem telemetria |
| NAO_APLICAVEL | N/A |

---

## Matriz (estado lógico do motor)

| ID | Nome | Pré-correção (típico) | Pós-correção | Fonte de decisão | Notas |
|----|------|----------------------|--------------|------------------|-------|
| NGINX | Firewall de Rede (Nginx) | ATUOU / OBSERVADA | Igual | attack_origins | OK |
| FAIL2BAN | Proteção Automática | ATUOU / OBSERVADA / SEM | Igual | banned_ips + available | OK |
| UFW | Firewall de Host | ATUOU / OBSERVADA | Igual | ufw DENY | Assume UFW sempre “observável” |
| CLOUDFLARE | Filtragem IP/Geoloc | OBSERVADA / SEM | Igual | ficheiro proxy-guard | Sem telemetria CF Analytics |
| RATE_LIMIT | Rate Limiting (Nginx) | **SEM_TELEMETRIA (bug)** | **ATUOU / OBSERVADA / SEM** | conf + error.log | Corrigido SEC-OBS-001 |
| AUTH_GUARD | Autenticação | ATUOU / OBSERVADA | Igual | alertas auth | OK |
| BOT_DETECT | Anti-Bot Turnstile | OBSERVADA / SEM | Igual | env keys | Sem granularidade geo |
| RBAC | RBAC e Permissões | OBSERVADA | Igual | constante | OK para externo |
| INPUT_VAL | Validação Backend | ATUOU / OBSERVADA | Igual | enumerationAlerts | OK |
| INJECT_PROT | Proteção Injeção | OBSERVADA | Igual | constante | Telemetria fraca |
| TLS | TLS 1.3 | OBSERVADA / SEM | Igual | cert PEM | OK |
| TENANT_ISO | Isolamento Tenants (RLS) | N/A | **N/A** (texto clarificado) | escopo painel | RLS piloto existe no produto |
| OBSERVATORY | SEC-01 | ATUOU / OBSERVADA | Igual | env observatory | ATUOU se flag ON (mesmo sem eventos da origem) |
| CORRELATION | SEC-02 | OBSERVADA | Igual | constante | Telemetria fraca por origem |
| BACKUP | Backup Automático Imutável | N/A | **N/A** (texto clarificado) | escopo + ADR-018 | Sem pipeline auto imutável |
| INTEGRITY | Controle de Integridade | OBSERVADA / SEM | Igual | proxy fail2ban | Gap de telemetria dedicada |
| DB_PROTECT | Proteção BD (RLS) | OBSERVADA | Igual (texto “piloto”) | constante | Alinhado a RLS parcial |
| AUDIT | Auditoria Imutável | ATUOU | Igual | constante no drill-down | Sempre ATUOU quando há análise |
| INCIDENT | Resposta Automática | ATUOU / OBSERVADA | Igual | blocked_ips | OK |
| GOVERNANCE | Governança | OBSERVADA | Igual | constante | Processo, não sensor |

---

## Smoke pós-deploy (2026-07-23)

Origem `??` (não enriquecida / indeterminada), janela com error.log.1:

| Camada | Status | Evidência (resumo) |
|--------|--------|-------------------|
| RATE_LIMIT | ATUOU | 104 evento(s) limit_req — IPs `2804:…593`, `216.144.249.201` |
| TENANT_ISO | NAO_APLICAVEL | RLS piloto existe; N/A para origem externa |
| BACKUP | NAO_APLICAVEL | Fora do drill-down; ADR-018 |

`infrastructure.nginx_rate_limit = true`  
`rate_limit_hits.length = 2` (IPs agregados)
