# PM2 RECOVERY DIAGNOSTIC — R1

**Data:** 2026-06-03T22:54:00Z  
**Servidor:** `/var/www/impetus-completa`  
**IP público:** 72.61.221.152

---

## Estado PM2 (pré-recovery)

| Processo | ID | Status | PID | Uptime (pré) | Restarts | Unstable |
|----------|-----|--------|-----|--------------|----------|----------|
| **impetus-backend** | 3 | ✅ online | 597793 | 46m | 349 | 0 |
| **impetus-frontend** | 2 | ✅ online | 541909 | 8h | 157 | 0 |
| impetus-edge-agent-lab | 6 | online | 162983 | 7D | 1 | 0 |
| impetus-lab-modbus | 4 | online | 162759 | 7D | 0 | 0 |
| impetus-lab-opcua | 5 | online | 164423 | 7D | 19 | 0 |
| impetus-lab-oidc | 7 | online | 184415 | 7D | 9 | 0 |
| impetus-lab-smtp | 8 | online | 184427 | 7D | 51 | 0 |
| lipsync-api | 1 | online | N/A | 10D | 1 | 0 |

---

## Diagnóstico principal

| Item | Resultado |
|------|-----------|
| Backend online/offline | ✅ **ONLINE** |
| Frontend online/offline | ✅ **ONLINE** |
| Restart loop activo | ❌ **Não** (`unstable_restarts: 0` em ambos) |
| CPU | 0% (idle normal) |
| Memória backend PM2 | Não reportada (0b no list — artefacto PM2) |
| Memória frontend heap | ~10.81 MiB (88% heap usage) |

---

## Configuração PM2 detectada

### impetus-backend
| Campo | Valor |
|-------|-------|
| Script | `/var/www/impetus-completa/backend/src/server.js` |
| CWD | `/var/www/impetus-completa/backend` |
| Node | v20.18.2 |
| NODE_ENV | development |
| Modo | fork_mode |

### impetus-frontend
| Campo | Valor |
|-------|-------|
| Script | `/usr/bin/npm run preview:prod` |
| CWD | `/var/www/impetus-completa/frontend` |
| Node | v20.20.0 |
| NODE_ENV | development |

---

## Erros observados nos logs (não bloqueantes)

| Origem | Erro | Impacto |
|--------|------|---------|
| Gemini | `API_KEY_INVALID` | ⚠️ Vertex/Gemini down — não bloqueia recovery |
| Anam | `persona skipGreeting PATCH 401 Invalid API key` | ⚠️ Anam Lab key — voz Anam externa |
| Rotas internas | 6 rotas governance com syntax error | ⚠️ Rotas internas não carregadas — não afectam core |
| Frontend (histórico) | `ENOENT dist/index.html` | ✅ Resolvido — build presente em 2026-06-03 22:53 |
| Runtime | `rollout.toFixed is not a function` | ⚠️ Warning calibração — não crash |
| Auth | `JWT_SECRET com menos de 32 caracteres` | ⚠️ Warning segurança |

---

## Telemetria backend (saudável)

Logs recentes mostram fluxo normal:
```
[INDUSTRIAL_EVENT_PUBLISHED] environment.telemetry.sample_ingested
```

---

## Conclusão R1

Ambiente **já operacional** antes do restart controlado. Histórico elevado de restarts (349 backend / 157 frontend) indica instabilidade passada, mas **sem loop activo** no momento do diagnóstico.

**Veredicto diagnóstico:** Recuperação necessária como **certificação e restart controlado**, não como emergência de processos offline.
