# ADMIN_LOGIN_INCIDENT_INVESTIGATION — P0

**Data:** 2026-07-22 ~21:50–22:00 UTC  
**Modo investigação:** leitura + correção mínima operacional  
**Sintoma:** Admin login mostra *"Servidor indisponível. Tente novamente em instantes."*

---

## 1. Reprodução

| Passo | Resultado |
|-------|-----------|
| Abrir `/painel/login` | HTML/CSS/formulário OK |
| Página carrega `GET /api/impetus-admin/auth/bot-config` | **504** / **499** (rt 60–120 s) |
| Mensagem no UI | "Servidor indisponível…" (mapeamento 502/504 em `admin-portal/src/api/http.js`) |

Evidência nginx (`impetus-access.log`):
```
GET /api/impetus-admin/auth/bot-config HTTP/2.0" 504 … rt=120.012
GET /api/impetus-admin/auth/bot-config HTTP/2.0" 504 … rt=60.055
```

---

## 2. Ponto da falha

```
ROOT_FAILURE_LAYER = BACKEND (Node.js heap OOM / event-loop stuck)
```

| Camada | Estado no incidente |
|--------|---------------------|
| Frontend admin-portal | OK (render + mensagem correcta para 504) |
| Cloudflare / DNS | OK |
| nginx | OK — proxy para `127.0.0.1:4000`; timeout → 504 |
| Backend :4000 | **FALHA** — listen activo mas sem resposta (timeout 8s+); heap ~94% / ~2 GB |
| PostgreSQL | Aceitava conexões; pool app saturado (`totalCount:35 idle:0 waiting:3–16`) |
| Auth/RBAC/license | Não alcançados (pedido não completava) |
| FIX-006 /health | **Não relacionado** — falha era global do processo |

---

## 3. Backend (pré-correção)

| Métrica | Valor |
|---------|-------|
| PM2 status | online (falso positivo operacional) |
| PID | 3015787 |
| Uptime | ~2h |
| Restarts históricos | 510 |
| RSS | ~2.1 GB |
| Used Heap | ~1913 MiB / 94% |
| `/health` local | **timeout 8s** |
| Log | `FATAL ERROR: … JavaScript heap out of memory` + `JsonStringify` |
| Pool | `[DB][POOL_PRESSURE] totalCount:35 idleCount:0` |

Misconfiguração PM2 observada:
- `script args = NODE_OPTIONS=--max-old-space-size=1536` (deveria ser `interpreter args`)
- `max_memory_restart: 1G` **não reiniciou** o processo a tempo

---

## 4. Fluxo de login (auditoria)

```
Login.jsx → api('/auth/bot-config') → /api/impetus-admin/auth/bot-config
         → api('/auth/login')        → /api/impetus-admin/auth/login
```

- Endpoint correcto: sim (`BASE = '/api/impetus-admin'`)
- Timeout: nginx 60–120s → 504 HTML → frontend sem JSON → mensagem genérica
- Exception no backend: OOM fatal (não 4xx de auth)
- Banco: pressão de pool sintoma paralelo, não causa primária do OOM

---

## 5. Frontend

`admin-portal/src/api/http.js` L38–41:
```js
res.status === 504 || res.status === 502
  ? 'Servidor indisponível. Tente novamente em instantes.'
```

`FALSE_SERVER_UNAVAILABLE = FALSE` — a mensagem reflectia correctamente indisponibilidade real do backend.

---

## 6. Correlação FIX-006 / health

Sem relação causal. Health e login falhavam pelo mesmo processo Node esgotado. Após restauro, `/health` e `/health/integrations` OK.
