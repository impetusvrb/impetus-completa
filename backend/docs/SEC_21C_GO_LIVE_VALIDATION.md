# SEC-21C — Enterprise Go-Live Validation & Final Authorization

**Fase:** SEC-21C  
**Modo:** 100% consultivo — read-only por defeito  
**Flag:** `SECURITY_GO_LIVE_VALIDATION=false`

## Filosofia

| Fase | Papel |
|------|-------|
| SEC-21B | Reconcilia baseline |
| **SEC-21C** | **Autorização final** para Go-Live |

Única autorização válida para:

```bash
scripts/security/apply-sec21-activation.sh --apply
pm2 restart impetus-backend --update-env
```

## Decisões

- `GO_LIVE_APPROVED`
- `GO_LIVE_APPROVED_WITH_REMARKS`
- `GO_LIVE_DENIED`

## Validações obrigatórias

1. Baseline (SEC-21B aprovado + sincronizada + Integrity ≥ 0.95)
2. Runtime (PM2, backend, nginx, PostgreSQL, TLS)
3. Cadeia SEC-01 → SEC-21B
4. Endpoints audit
5. Segurança (hardening, anti-scanner, UFW, SSH, rollback)
6. Recursos (CPU, memória, heap, event loop)
7. GO_LIVE_GUARD (Fase 1: 5 min @ 5s · Fase 2: 10 min @ 30s)

## Endpoint

```
GET /api/audit/security-go-live-validation
```

## Comando

```bash
node backend/src/tests/audit/SEC_21C_GO_LIVE_VALIDATION.test.js
```

## Sequência operacional

```
SEC-21B → integrity-check.sh --baseline → SEC-21C → apply-sec21-activation.sh → pm2 restart → GO_LIVE_GUARD
```

*SEC-21C — último gate técnico antes da activação Enterprise Security.*
