# IECP — GAP_ANALYSIS_REPORT

> **Objetivo:** divergências entre software actual, Plano Mestre v2 e requisitos IECP  
> **Data:** 2026-06-22

---

## 1. Divergências críticas (P0)

| # | Gap | Plano / IECP espera | Estado actual | Impacto | Acção |
|---|-----|---------------------|---------------|---------|-------|
| G1 | **82% telas NAO_VALIDADO** | 100% classificadas (G1) | 63/77 sem validação | Selo enterprise bloqueado | CERT-01.4 lotes por módulo |
| G2 | **NODE_ENV=development** em PM2 | `production` + bind 127.0.0.1 | `development` activo | Hardening P0 incompleto | CERT-02.0 activação |
| G3 | **1098 endpoints sem cert individual** | request/auth/tenant/error cada um | só subset E2E | Superfície desconhecida | Pipeline endpoint audit (IECP) |
| G4 | **Evidência visual ausente** | Screenshot real por fluxo | `screenshot.txt` placeholder | STATUS ≠ certificado operacional | Browser E2E + capturas |
| G5 | **Fase 0 congelamento** | `architecture-freeze.mdc` | não existe | Risco de drift arquitectural | Criar regra + baseline |

---

## 2. Divergências altas (P1)

| # | Gap | Esperado | Actual | Acção |
|---|-----|----------|--------|-------|
| G6 | Refresh token + HttpOnly + CSRF | CERT-02.1 | não implementado | Sessão enterprise |
| G7 | UFW Cloudflare-only | activo em prod | script pronto, activação incerta | Executar `infra/scripts/` |
| G8 | `ALLOWED_ORIGINS` / `LISTEN_HOST` | definidos em .env | gaps documentados | CERT-02.2 |
| G9 | Telemetria PLC | dados reais dashboard CEO | widgets "indisponível" | Integração OPC/PLC ou classificar AMARELO permanente |
| G10 | UI ESG / ManuIA / AIOI | ligada às APIs certificadas | backend VERDE, UI NAO_VALIDADO | FIX fase 3 por matriz |
| G11 | SST completo (APR, inspeções) | certificação integral IECP | só lifecycle 3 eventos | Novos cenários E2E + UI |
| G12 | Quality completo (auditorias, planos) | workflows todos certificados | NC→CAPA certificado | Expandir cenários |
| G13 | TPM indicadores OEE/MTBF/MTTR | certificados | só preventiva create/complete | APIs + UI + E2E |
| G14 | RBAC níveis 0–5 | leitura/escrita/exclusão/aprovação | smoke parcial 7 roles | Matriz permissões × endpoint |
| G15 | Multi-tenant cruzado | testes sistemáticos | 4 cenários com tenant_isolation | Suite dedicada |

---

## 3. Divergências médias (P2)

| # | Gap | Esperado | Actual |
|---|-----|----------|--------|
| G16 | Rastreio botão→endpoint | v2 buildFunctionalMatrix | só cruzamento path api.js |
| G17 | Observabilidade prod | Prom/Graf/OTEL activos | docker opcional desligado |
| G18 | Backup + restore drill | certificado IECP | backups pontuais sem restore test |
| G19 | CI/CD completo | build/test/deploy/rollback | só cert-drift workflow |
| G20 | Testes invasão | documentados IECP | não executados neste ciclo |
| G21 | 324 endpoints sem requireAuth | auditados | inventário existe, validação pendente |
| G22 | EVENT_GOVERNANCE_* flags | configuradas | defaults OFF no .env |
| G23 | Piloto industrial formal | CERT-04 | não iniciado |
| G24 | Go-live / escala | CERT-07 | não iniciado |

---

## 4. Funcionalidades existentes vs IECP

### ✅ Existente e alinhado (validar, não reconstruir)
- Matriz + inventários + drift gate
- 10 cenários E2E com evidências API/DB/log
- Domínios operacionais: Quality universal workflow, SST events, environment events
- UI piloto: NcrCapaPanel, SafetyIncidentPanel, TPM preventivo
- MFA, JWT, HTTPS, rate limit Nginx
- 410+ scripts `test:*` no backend (cobertura unitária/enterprise existente)

### 🟡 Existente mas parcial / divergente
- `report.json` Quality ainda classifica UI como INCOMPLETO no campo `classification` (matriz já VERDE — **drift documental**)
- Executive dashboard: VERDE backend, telemetria AMARELO
- ESG workspace: flags activas, UI stub
- ManuIA: API certificada, páginas não validadas
- AIOI: módulo extenso, 1 cenário correlacionado apenas

### ❌ Existente no código mas não certificado IECP
- Admin (15 telas): cadastros, logs, warehouse, structural
- Logistics (5 telas)
- Chat/IA, Pulse, Biblioteca
- Maioria dos endpoints AIOI / cognitive / executive portal

### ❌ IECP exige mas não existe / não activo
- Sessão refresh HttpOnly
- DR drill certificado
- HA / replicação multi-região
- Learning layer em piloto real (CERT-04.3)

---

## 5. Integrações

| Integração | Existe | Certificada | Gap |
|------------|--------|-------------|-----|
| PostgreSQL tenant-scoped | ✅ | 🟡 | RLS formal test |
| Asaas billing webhook | ✅ | ✅ | UI billing não |
| Safety operational events | ✅ | ✅ | APR/inspeções |
| Quality intelligence + universal WF | ✅ | ✅ | auditorias UI |
| ManuIA → work_orders | ✅ | ✅ | UI ManuIA |
| Environment operational | ✅ | ✅ | UI ESG |
| OPC/PLC telemetria | 🟡 | ❌ | dados vivos CEO |
| Prometheus/Grafana | 🟡 infra | ❌ | não prod |
| Cloudflare | 🟡 | ❌ | UFW script |
| OpenAI/D-ID/voz | ✅ | ❌ | fora escopo 10 cenários |

---

## 6. Funcionalidades quebradas / risco (conhecido)

| Item | Sintoma | Estado |
|------|---------|--------|
| Resolve alerta com parseInt | UUID falhava | ✅ Corrigido |
| SST tipo_alerta CHECK | 503 POST events | ✅ Migration aplicada |
| ManuIA 403 | perfil manutenção | ✅ Alargado |
| Validação organizacional 503 | rate limit Nginx | ✅ Corrigido (fora git) |
| Token GitHub scope workflow | push workflow falhava | ✅ Publicado via API |

_Nenhum P0 funcional aberto conhecido nos 10 cenários E2E (última run 2026-06-22 OK)._

---

## 7. Matriz de priorização IECP (próximas 4 semanas)

```
Semana 1: Fase 0 + CERT-01.4 (Admin + Core login/auth)
Semana 2: CERT-01.4 (Logistics, ManuIA UI, ESG UI) + evidência visual
Semana 3: CERT-02.0 P0 (NODE_ENV prod, UFW, ORIGINS) + multi-tenant suite
Semana 4: Expandir cenários domínio (SST APR, Quality auditoria, TPM OEE) + piloto prep
```

---

## 8. Gate de continuidade

**Não avançar para CERT-04 (piloto) até:**

- [ ] G1 fechado ou ≤10% NAO_VALIDADO com justificativa DESABILITADO
- [ ] G2 NODE_ENV production
- [ ] G4 evidência visual nos 10 cenários + telas VERDE
- [ ] G6 sessão enterprise OU aceite documentado de risco
- [ ] G18 backup restore testado uma vez

**Pode avançar já (sem refazer):**
- Lotes CERT-01.4 usando smoke + classificação
- UI FIX ESG/ManuIA seguindo padrão Quality/SST
- Screenshots browser nos fluxos já VERDE

---

## 9. Referências

| Documento | Path |
|-----------|------|
| Plano Mestre v2 | `backend/docs/PLANO_MESTRE_LIGACAO_INDUSTRIAL_v2.md` |
| Manual matriz | `backend/docs/MANUAL_MATRIZ_FUNCIONAL_REAL.md` |
| Matriz canónica | `backend/docs/FUNCTIONAL_MATRIX.json` |
| Status ciclo | `backend/docs/CERTIFICATION_STATUS.md` |
| Evidências | `backend/docs/evidence/README.md` |

---

_Analise de gaps IECP — base para execução a partir de CERT-01.4._
