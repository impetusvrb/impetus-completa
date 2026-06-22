# IECP — CERTIFICATION_PROGRESS_REPORT

> **Fonte única de verdade:** `backend/docs/FUNCTIONAL_MATRIX.json`  
> **Última certificação E2E:** 2026-06-22  
> **Ciclo anterior:** CERT-01.1

---

## 1. Métricas globais

| Métrica | Valor | Meta IECP | % |
|---------|-------|-----------|---|
| Telas mapeadas | 77 | 77 | 100% |
| Telas VERDE (E2E + evidência) | 6 | 77 | **7,8%** |
| Telas AMARELO | 3 | — | 3,9% |
| Telas REDIRECT | 5 | — | 6,5% |
| Telas NAO_VALIDADO | 63 | 0 | **81,8%** |
| Endpoints inventariados | 1.098 | 1.098 | 100% |
| Endpoints certificados individualmente | ~0 | 1.098 | **<1%** |
| Cenários domínio (Parte 7.2) | 10/10 VERDE | 10 | **100%** |
| Fluxos órfãos (UNRESOLVED) | 0 | 0 | 100% |
| Drift estrutural | 0 | 0 | ✅ |

---

## 2. Semáforo por módulo (telas)

| Módulo | Total | VERDE | AMARELO | NAO_VALIDADO | REDIRECT |
|--------|-------|-------|---------|--------------|----------|
| **Quality** | 5 | 3 | 0 | 2 | 0 |
| **SST** | 4 | 2 | 0 | 2 | 0 |
| **ESG** | 3 | 0 | 2 | 1 | 0 |
| **Core** | 30 | 1 | 1 | 28 | 0 |
| **Admin** | 15 | 0 | 0 | 15 | 0 |
| **Logistics** | 5 | 0 | 0 | 5 | 0 |
| **ManuIA** | 2 | 0 | 0 | 2 | 0 |
| **Custos/Billing** | 3 | 0 | 0 | 3 | 0 |
| **Chat/IA** | 2 | 0 | 0 | 2 | 0 |
| **Pulse** | 2 | 0 | 0 | 2 | 0 |
| **Biblioteca** | 1 | 0 | 0 | 1 | 0 |
| **Desconhecido** | 5 | 0 | 0 | 0 | 5 |

### Telas VERDE confirmadas
- `Core/Dashboard` — executivo por perfil
- `Quality/QualityOperationalWorkspacePage` (×2 rotas governance)
- `Quality/QualityInspectionRuntimePage`
- `SST/SafetyOperationalWorkspacePage` (×2 rotas operacional)

---

## 3. Cenários certificados (10/10)

| Domínio | Backend | UI (uiGap) | Evidência | 6 evidências IECP |
|---------|---------|------------|-----------|-------------------|
| Quality NC→CAPA | VERDE | VERDE | `quality/nc-create/` | API ✅ DB ✅ Log ✅ Tenant ✅ Visual 🟡 |
| SST lifecycle | VERDE | VERDE | `safety/lifecycle/` | API ✅ DB ✅ Log ✅ Tenant ✅ Visual 🟡 |
| Executive | VERDE | — | `executive/dashboard-profile/` | API ✅ parcial visual |
| ManuIA | VERDE | — | `manuia/diagnosis-workorder/` | API ✅ DB ✅ |
| ESG | VERDE | INCOMPLETO | `esg/emission-waste-consumption/` | API ✅ UI stub |
| TPM | VERDE | — | `tpm/preventive-lifecycle/` | API ✅ UI piloto mecânico |
| DSR/LGPD | VERDE | — | `dsr/data-subject-request/` | API ✅ |
| Billing | VERDE | — | `billing/asaas-webhook/` | API ✅ DB ✅ |
| Event Governance | VERDE | — | `governance/event-policy-decision/` | API ✅ |
| AIOI | VERDE | — | `aioi/correlation-insight/` | API ✅ |

**Regra IECP:** ausência de evidência visual real → cenário **backend certificado**, operação industrial **parcial**.

---

## 4. Progresso por bloco IECP

### 4.1 FUNCTIONAL_MATRIX (fonte única)
| Campo | Cobertura |
|-------|-----------|
| tela / rota | ✅ 77/77 |
| endpoint (inventário) | ✅ 1098 |
| serviço / tabela | 🟡 inferido em cenários; não em todas as linhas |
| tenant / permissão | 🟡 smoke + isolamento em 10 cenários |
| fluxo E2E | 🟡 10 fluxos, não 100% |
| status | 🟡 16/77 com status ≠ NAO_VALIDADO |
| evidências | 🟡 10 pastas; telas sem `evidence` |

### 4.2 Certificação 77 telas
| Critério | Progresso |
|----------|-----------|
| Renderização | 🟡 6 validadas E2E |
| Navegação | 🟡 domínios Quality/SST validados |
| Responsividade | ❌ não sistematizado |
| Permissões | 🟡 smoke 7 perfis |
| Persistência | 🟡 por cenário |

### 4.3 Certificação 1098 endpoints
| Critério | Progresso |
|----------|-----------|
| Request/response real | 🟡 ~80 endpoints nos 10 cenários + smoke |
| Auth/authz | 🟡 smoke parcial |
| Logs/auditoria | 🟡 excerpts em evidências |
| Tenant | 🟡 testes em Quality, SST, DSR, Executive |
| Tratamento erro | ❌ não sistematizado |

### 4.4 Bloco 3 — Segurança Enterprise
| Item | Status |
|------|--------|
| PM2 produção | 🟡 online mas `NODE_ENV=development` |
| Nginx + SSL | ✅ HTTPS activo |
| Cloudflare / UFW | 🟡 scripts em `infra/`; activação variável |
| JWT | ✅ reforçado |
| Refresh / HttpOnly / CSRF | ❌ |
| Rate limit / lockout | 🟡 Nginx + middleware parcial |
| Testes invasão | ❌ |

### 4.5 Multi-tenant
| Teste | Status |
|-------|--------|
| Isolamento APIs (10 cenários) | ✅ |
| Teste cruzado sistemático | ❌ |
| Isolamento eventos/permissões | 🟡 parcial |

### 4.6 RBAC hierarquia (níveis 0–5)
| Validação | Status |
|-----------|--------|
| Leitura core | ✅ smoke |
| Escrita/exclusão/aprovação por domínio | ❌ IECP completo |

### 4.7 Domínios industriais

| Domínio | Backend | UI | IECP integral |
|---------|---------|-----|---------------|
| **Quality** (NC,CAPA,auditoria,SPC) | 🟡 cenário NC→CAPA | 🟡 NCR/CAPA panel | **~45%** |
| **SST** (incidente,APR,inspeção,treino) | 🟡 lifecycle 3 tipos | 🟡 incident panel | **~35%** |
| **ESG** | ✅ eventos API | 🟡 workspace stub | **~30%** |
| **ManuIA** | ✅ OS/sessão | ❌ UI não certificada | **~25%** |
| **TPM** (OEE,MTBF,MTTR) | 🟡 preventiva | 🟡 form mecânico | **~20%** |
| **AIOI** | 🟡 correlação | ❌ cockpit não E2E | **~25%** |

### 4.8 Observabilidade
| Stack | Status |
|-------|--------|
| Prometheus/Grafana/OTEL | 🟡 docker opcional, não prod |
| Logs/métricas/tracing | 🟡 código existe, não homologado IECP |

### 4.9 Backup & DR
| Item | Status |
|------|--------|
| Backup automatizado certificado | ❌ |
| Restore testado | ❌ |
| Rollback deploy | 🟡 atomic build frontend |

### 4.10 CI/CD
| Gate | Status |
|------|--------|
| Drift matriz | ✅ GHA + servidor |
| Build/test/deploy pipeline | ❌ |
| Rollback auditado | 🟡 parcial |

### 4.11 Piloto & Go-live
| Fase | Status |
|------|--------|
| Implantação controlada | ❌ formal |
| Treinamento / operação assistida | ❌ |
| Rollout escala | ❌ |

---

## 5. Selos IECP

| Selo | Estado | Bloqueador principal |
|------|--------|----------------------|
| Funcionalmente certificado (backend) | ✅ | — |
| Operacionalmente certificado | 🟡 | 63 telas + telemetria PLC |
| Pronto para piloto | 🟡 | CERT-01.4 + evidência visual |
| Produção enterprise | ❌ | CERT-02 + CERT-03 + 100% matriz |

---

## 6. Comandos de verificação contínua

```bash
node backend/scripts/audit/e2e_cert_all.js      # 10 cenários
node backend/scripts/e2e_role_smoke.js          # 7 perfis
cd backend && npm run cert:drift                # anti-drift
bash scripts/cert-drift-gate.sh                 # gate servidor
```

---

_Progresso medido contra FUNCTIONAL_MATRIX commitada. Próxima actualização após CERT-01.4._
