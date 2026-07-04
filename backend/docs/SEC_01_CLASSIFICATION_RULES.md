# SEC-01 — Classification Rules (Determinísticas)

**Sem IA generativa. Ordem de precedência top-down.**

---

## HTTP Aggregate Rules

| # | Condição | Classification | Event Type |
|---|----------|----------------|------------|
| 1 | path = `/health` | HEALTH_CHECK | HTTP_SCAN |
| 2 | IP trusted operator CIDR | OPERATIONAL_ACCESS | PATH_DISCOVERY |
| 3 | IP 127.0.0.1 / ::1 | INTERNAL_ACCESS | PATH_DISCOVERY |
| 4 | UA matches GPTBot/Claude-SearchBot/Googlebot | CRAWLER | BOT_ACTIVITY |
| 5 | path matches scanner regex (`.env`, docker-compose, `.git`, actuator) | CREDENTIAL_SCAN | HTTP_SCAN |
| 6 | path starts `/api/auth` OR status 401 > 0 | ENUMERATION | AUTH_ATTEMPT |
| 7 | UA matches bot/scanner regex | GENERIC_SCANNER | BOT_ACTIVITY |
| 8 | (404+444) > 70% AND total >= 5 | ENUMERATION | ENUMERATION |
| 9 | total >= 50 AND 404 rate > 50% | BACKGROUND_INTERNET_NOISE | HTTP_SCAN |
| 10 | path starts `/assets/` | CRAWLER | ASSET_DISCOVERY |
| 11 | status 403 > 0 | GENERIC_SCANNER | HTTP_SCAN |
| 12 | default | UNKNOWN | PATH_DISCOVERY |

---

## Scanner Path Regex (excerpt)

```
.env, docker-compose, server.js, package.json, credentials, secrets,
wp-admin, phpmyadmin, .git, actuator, config.js/json/yml, appsettings
```

---

## Bot UA Regex (excerpt)

```
bot, crawler, spider, scan, curl, wget, python-requests, GPTBot,
Claude-SearchBot, Silvy X Ran, nikto, sqlmap, masscan
```

---

## Trusted Operator CIDRs

Env: `SECURITY_OBSERVATORY_TRUSTED_CIDRS`  
Default: `170.246.0.0/16,186.225.0.0/16,127.0.0.1`

---

## External Events

| Type | Default Classification |
|------|------------------------|
| SSH_EVENT (fail) | GENERIC_SCANNER |
| SSH_EVENT (ok) | OPERATIONAL_ACCESS |
| PM2_EVENT | INTERNAL_ACCESS |
| FILE_INTEGRITY | OPERATIONAL_ACCESS |
| CONFIG_CHANGE | OPERATIONAL_ACCESS |

---

## Contexto relatório Gustavo (~23k / 3h)

Janela 23:04–02:05 com ~127 req/min classificaria predominantemente como:
- `BACKGROUND_INTERNET_NOISE` + `CREDENTIAL_SCAN` + `GENERIC_SCANNER`

Timeline marcos: 23:04, 23:18, 23:41, 00:19, 01:07, 02:05
