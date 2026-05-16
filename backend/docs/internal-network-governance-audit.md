# Auditoria — Internal Network Governance (CIDR/IP Allowlist)

**Data:** 2026-05-15  
**Prioridade:** CIDR/IP allowlist real para `/api/internal/*`

---

# [CONFIRMADO] — Riscos que existiam

| Risco | Evidência | Ficheiro |
|-------|-----------|----------|
| CIDR não implementado | Comentário "não fazemos parsing CIDR" | `internalRouteGuard.js` L63-65 (removido) |
| Match apenas literal | `entry === norm` sem `/8`, `/16` | `internalRouteGuard.js` (legado) |
| Spoof X-Forwarded-For | `clientIp` usava sempre primeiro XFF | `internalRouteGuard.js` L50-53 |
| Sem deny-by-default rede | Allowlist vazia = tudo permitido | Comportamento legado |
| unified-health sem rede | Só `requireAuth` | `server.js` |

**Impacto:** rotas internas acessíveis de qualquer IP com JWT válido + role.  
**Regressão possível:** bloqueio de operadores legítimos fora da VPN se `DENY_BY_DEFAULT=true` sem CIDR.

---

# [IMPLEMENTADO]

## Camada Internal Network Governance

| Componente | Ficheiro | Função |
|------------|----------|--------|
| Core CIDR + anti-spoof | `services/internalNetworkGovernance.js` | IPv4/IPv6, `ipaddr.js`, env governance |
| Middleware | `middleware/internalNetworkGuard.js` | `requireInternalNetworkAccess`, registry, logs |
| Status API | `routes/internal/governance.js` | `GET /api/internal/governance/status` |
| Integração | `server.js` | `internalNet()` antes de `internalAcl()` em todas `/api/internal/*` |
| Dependência | `package.json` | `ipaddr.js` explícito |

## Env vars

```env
IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST=
IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST=true
IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=false
IMPETUS_INTERNAL_ROUTE_TRUST_PROXY=true
IMPETUS_TRUSTED_PROXY_CIDRS=
IMPETUS_INTERNAL_NETWORK_DEV_BYPASS=true   # fora de production
IMPETUS_INTERNAL_IP_ALLOWLIST=             # legado, mesclado
```

## Logs estruturados

- `[INTERNAL_ROUTE_ALLOWED]`
- `[INTERNAL_ROUTE_BLOCKED]`
- `[INTERNAL_ROUTE_PROXY_MISMATCH]`
- `[INTERNAL_ROUTE_CIDR_MATCH]`

Campos: route, ip, ip_source, socket_ip, matched_cidr, reason, user_id, company_id, tenant, role.

## Trust proxy / anti-spoof

- X-Forwarded-For **só** aceite se `socket.remoteAddress` ∈ `IMPETUS_TRUSTED_PROXY_CIDRS`
- Conexão directa com XFF presente → `PROXY_SPOOF_RISK` → 403
- Express `trust proxy` mantido em `1` (`server.js` L45); resolução de IP é **própria** (não cega em `req.ip`)

## Rotas protegidas

Todas em `INTERNAL_ROUTE_REGISTRY`:

- `/api/internal/governance` (novo)
- `/api/internal/sales`
- `/api/internal/unified-metrics`
- `/api/internal/unified-health`
- `/api/internal/vector-health`
- `/api/internal/test-environmental-cognitive`
- `/api/internal/enterprise`
- `/api/internal/operational-runtime`
- `/api/internal/shadow-routes`

**Ordem middleware:** `requireAuth` → `requireInternalNetworkAccess` → `requireInternalAccess` → rate limit

## Fallback dev

- `NODE_ENV !== 'production'` + `IMPETUS_INTERNAL_NETWORK_DEV_BYPASS` (default `true`) → rede aberta em dev
- Localhost sempre na allowlist quando `ALLOW_LOCALHOST=true`

## Testes

`npm run test:enterprise-internal-network` — **12/12**

## Rollback

1. `IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=false` e CIDR vazio
2. `IMPETUS_INTERNAL_NETWORK_DEV_BYPASS=true`
3. Remover `internalNet()` de `server.js` (último recurso)

## Produção recomendada

```env
NODE_ENV=production
IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=true
IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1/32,::1/128
IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST=true
IMPETUS_TRUSTED_PROXY_CIDRS=127.0.0.1/32,10.0.0.0/8
```

`pm2 restart impetus-backend --update-env`

---

# [JÁ PROTEGIDO]

| Item | Estado |
|------|--------|
| `requireAuth` | Mantido |
| `requireInternalAccess` | Mantido |
| Shadow route registry | `shadowRouteRegistry.js` |
| Feature flags internas | `IMPETUS_INTERNAL_ROUTES_ENABLED` |
| HTML/JS cache headers | `serveDist.cjs` |
| Motor A/B | Sem alteração |

---

# [DOCUMENTADO] — Fases futuras (não implementadas agora)

| Item | Decisão |
|------|---------|
| nginx blue/green | Deploy atómico (`build:atomic`) cobre PM2; nginx swap opcional |
| Service workers dedicados | Manter; risco push/offline — análise produto |
| Tracing distribuído OTel | Correlation IDs já existem; OTel full stack fase posterior |
| WebSocket deploy signaling | BuildVersionGuard suficiente por agora |
| Schemas RH/financeiro | Registry Zod pronto; domínios quando houver payloads |
| nginx `allow/deny` duplicado | Recomendado em paralelo como defesa em profundidade |

---

# Validações

| Check | Resultado |
|-------|-----------|
| `test:enterprise-internal-network` | 12/12 |
| `test:enterprise-hardening` | 20/20 (regressão) |
| Frontend/CSS | Zero alterações |
| Shadow routes | Mantidas + rede |
