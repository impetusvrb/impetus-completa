# IMPETUS — Pronto para Indústria (Piloto)

**Data:** 2026-06-25  
**Estado:** Apto para **teste piloto em fábrica real** (instalação limpa, sem dados sintéticos).

---

## O que está garantido

| Verificação | Comando |
|-------------|---------|
| Smoke instalação limpa | `node backend/scripts/ops/smoke-clean-install.js` |
| Go Live completo | `node backend/scripts/ops/go-live-readiness.js <company_id> --structural-only` |
| Base Estrutural (strict) | `node backend/scripts/ops/validate-structural-readiness.js <company_id>` |
| Governança menu/módulos | `npm run test:contextual-modules` + `test:domain-isolation` + `executiveModuleIsolationScenarios.js` |

### Ambiente de produção

- `IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false` — enrichment sintético **desligado**
- `IMPETUS_INDUSTRIAL_LAB_ENABLED=false` — lab Docker **desligado**
- Backend PM2: `impetus-backend` (porta 4000)
- Frontend PM2: `impetus-frontend` (porta 3000)
- UI cognitiva mostra `data_state: empty` quando não há alertas, tarefas ou feed operacional

---

## Passo a passo — nova fábrica

### 1. Instalação automática

```bash
sudo bash backend/scripts/ops/install-industrial.sh
```

### 2. Criar empresa e utilizador CEO

Via portal admin ou script de ativação existente. O cliente **cadastra tudo**:

- Departamentos → Setores → Cargos (`company_roles`)
- Utilizadores com `company_role_id` obrigatório
- Equipamentos, ordens, integrações PLC (quando aplicável)

### 3. Validar prontidão

```bash
export COMPANY_ID="<uuid-da-empresa>"
node backend/scripts/ops/go-live-readiness.js "$COMPANY_ID" --structural-only
node backend/scripts/ops/smoke-clean-install.js
```

### 4. Atribuir cargos em falta (se necessário)

```bash
node backend/scripts/ops/backfill-missing-company-roles.js "$COMPANY_ID" --dry-run
node backend/scripts/ops/backfill-missing-company-roles.js "$COMPANY_ID"
```

### 5. Deploy após alterações

```bash
cd frontend && npm run build
pm2 restart impetus-backend impetus-frontend --update-env
```

---

## Tenant piloto conhecido (Fresh & Fit)

- **Company ID:** `511f4819-fc48-479e-b11e-49ba4fb9c81b`
- **CEO:** jucileiaj5san@gmail.com
- **RH:** joycesilva@gmail.com
- Base estrutural: 11 departamentos, 44 setores, 36 cargos

---

## Checklist assinável — dia 0 na fábrica

- [ ] Login CEO — menu sem Proaction, módulos executivos visíveis
- [ ] Login RH — módulos de pessoas, sem áreas de produção exclusivas de CEO
- [ ] Centro de Comando — badge `SEM DADOS OPERACIONAIS` até haver ordens/alertas/PLC
- [ ] Nenhum gráfico com valores inventados (sem fallback mock)
- [ ] Base Estrutural completa para todos os utilizadores activos
- [ ] Backup BD e `.env` documentados
- [ ] PM2 estável 48h (restarts < 3)

---

## Limitações conhecidas (não bloqueiam piloto)

- Certificação enterprise CERT-04 ainda em curso
- Utilizadores legacy sem `company_role_id` devem ser corrigidos antes de produção plena
- Telemetria PLC requer configuração por equipamento na fábrica

---

## Referências

- `backend/docs/INSTALACAO_INDUSTRIAL.md`
- `backend/docs/PLANO_IMPLANTACAO_INDUSTRIAL_COMPLETO.md`
