# CERT-04 — Pilot Execution Plan

**Programa:** IECP  
**Fase:** CERT-04 (piloto industrial formal)  
**Estado:** Em execução (P0E go-live aceite)

---

## 1) Critérios de entrada (go/no-go)

- CERT-03 readiness `READY` ou `READY_WITH_MINOR_GAPS`
- PM2 backend/frontend online em produção
- `npm run cert:drift` = ok
- Pipeline activo: `IMPETUS_EVENT_PIPELINE_ENABLED=true`
- `P0E_GO_LIVE_MONITORING.md` com `go_live_detected: true`

## 2) Janela de piloto

- **Duração mínima:** 72h contínuas
- **Início:** registado em `CERT-04_PILOT_LOG.json` (`pilot_started_at`)
- **Escopo mínimo:**
  - Quality NC/CAPA
  - SST incident lifecycle
  - ESG eventos ambientais
  - ManuIA diagnóstico
  - Dashboard executivo / KPIs

## 3) Evidências (6 tipos por domínio — regra VERDE)

| Tipo | O quê |
|------|--------|
| Visual | Screenshot ou rota UI acessível |
| API | Response JSON 2xx |
| BD | Row em tabela de domínio |
| Log | Entrada PM2 / audit |
| Tenant | `company_id` scoped |
| Operacional | Acção real (criar NC, incidente, etc.) |

## 4) Comandos operacionais

```bash
# Dia 0 — arranque piloto
cd backend && npm run cert:04:day0

# Durante 72h — revalidar
npm run cert:e2e && npm run cert:drift
node scripts/p0e_go_live_monitoring.js

# Fecho — após 72h estáveis
npm run cert:04:close
```

## 5) Sign-off

- Responsável operacional: preencher `CERT-04_SIGNOFF.md`
- Critério de sucesso: P0E `first_72h_stable: true` + 10 cenários E2E VERDE + 0 drift
