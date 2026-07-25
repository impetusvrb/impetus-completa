# APPSEC-01 — SSRF Protection

## Motor

`backend/src/securityApplication/ssrfProtectionEngine.js`

## Integrações obrigatórias

| Serviço | Função |
|---------|--------|
| `timeClockIntegrationService` | `safeFetch` |
| `plcAdapters/restAdapter` | `safeAxiosRequest` |

## Bloqueios

- RFC1918 (10/8, 172.16/12, 192.168/16)
- 127.0.0.0/8, 169.254.169.254
- localhost, *.local, *.internal
- IPv6 loopback / ULA / link-local
- Protocolos não-HTTPS
- Redirects (`redirect: 'error'`, `maxRedirects: 0`)
- DNS rebinding (valida todos os IPs resolvidos)

## Timeout

Default: 8000ms (`IMPETUS_APPSEC_SSRF_TIMEOUT_MS`)

## Auditoria

Evento: `APPSEC_SSRF_VALIDATION` (ALLOW / DENY_SYNTAX / DENY_DNS)

## Novas integrações

```javascript
const { safeFetch } = require('../securityApplication/ssrfProtectionEngine');
await safeFetch(url, { method: 'GET' }, { integration: 'my_module', companyId });
```

**Proibido:** `fetch(userControlledUrl)` directo.
