# SEC-RECON-GOV-001 — Relatório de Auditoria e Correção

**Data:** 2026-07-14  
**Prioridade:** P0  
**Estado:** Causa raiz comprovada · correção cirúrgica aplicada · backend reiniciado

---

## A. Causa raiz comprovada

**Sim.** O bloqueio sistémico «Not found» no Painel Administrativo é causado pelo **`validatedIdentityReconGuard`** quando o score de correlação por **IP** atinge **THROTTLE (≥6 efectivo)** ou **CONTAIN (≥9 efectivo)** após navegação normal entre módulos.

Cada endpoint distinto do painel incrementava **PATH_DISCOVERY (+1)**. Após ~9 rotas autenticadas, um admin legítimo era bloqueado com:

```json
HTTP 404
{ "success": false, "error": "Not found" }
```

**Simulação determinística (pré-correcção):**

| Rotas visitadas | Score | Score efectivo (−3) | Decisão | Guard |
|-----------------|-------|---------------------|---------|-------|
| 8 | 8 | 5 | SUSPECT | PASS |
| 9 | 9 | 6 | **THROTTLE** | **BLOCK** |
| 11+ | 11+ | 8+ | **CONTAIN** | **BLOCK** |

Isto explica o padrão transversal: Dashboard, Empresas, Usuários, Logs, 2FA, Dispositivos, Centro de Segurança, Governança IA, Risco IA — todos passam por `requireAdminAuth` → `runValidatedIdentityReconGuard`.

---

## B. Endpoints afectados

Todos os consumidores de `requireAdminAuth` em:

| Módulo | Prefixo API |
|--------|-------------|
| Dashboard | `/api/impetus-admin/dashboard/*` |
| Empresas | `/api/impetus-admin/companies/*` |
| Usuários | `/api/impetus-admin/users/*` |
| Logs | `/api/impetus-admin/logs` |
| 2FA | `/api/impetus-admin/auth/mfa/*` |
| Dispositivos | `/api/impetus-admin/device-trust/*` |
| Centro de Segurança | `/api/impetus-admin/security-dashboard/*` |
| Governança IA | `/api/admin-portal/ai-incidents/*` |
| Risco IA | `/api/admin-portal/risk-intelligence/*` |
| Conformidade IA | `/api/admin-portal/compliance/*` |

Rotas **existem** e respondem **200** quando o guard não bloqueia.

---

## C. Middleware exacto que produzia cada 404

| Camada | Ficheiro | Condição |
|--------|----------|----------|
| **Emissor do payload** | `validatedIdentityReconGuard.js` → `applyEnforcementResponse` | `decision === 'THROTTLE' \|\| 'CONTAIN'` |
| **Decisão** | `postValidationDecision.js` → `evaluateValidatedIdentityDecision` | `effectiveScore >= 6/9` |
| **Score** | `securityReconCorrelationEngine.js` | `PATH_DISCOVERY` por IP, janela 120s |
| **Montagem** | `adminPortalAuth.js` → `requireAdminAuth` | Após JWT válido + `req.adminUser` |

**Pre-auth** (`securityReconMiddleware`) **não** bloqueia requests autenticados.

Emissores alternativos de `{ success: false, error: "Not found" }`: **apenas** `securityReconMiddleware.js` (pre-auth) e `validatedIdentityReconGuard.js` (pós-auth).

---

## D. Evidência de runtime

- Simulação GOV-001: 12 módulos admin → bloqueio a partir da 9.ª rota (pré-fix).
- Teste HTTP pós-fix + restart: 11 endpoints → **0 falhas NEUTRAL_404**.
- `IMPETUS_SEC_RECON_GOV_001.test.js`: **3/3 PASS**.
- `IMPETUS_SEC_ANTI_RECON_004.test.js`: **22/22 PASS**.

---

## E–H. Relações e loops

- **validatedIdentityReconGuard:** envolvimento directo comprovado.
- **SECURITY_RECON_CORRELATION=true:** necessário para manifestação.
- **Falso positivo sistémico:** sim — navegação admin = recon.
- **Loop retry/polling:** sim parcial — 404 pós-block alimentava score (corrigido).

---

## I. Correção implementada

`adminOperationalRoutePolicy.js`:

1. Score delta **0** para sinais autenticados em `/api/impetus-admin/*` e `/api/admin-portal/*`.
2. Cap **THROTTLE/CONTAIN → SUSPECT** para admin validado via `requireAdminAuth` (excepto `externalBanObserved`).
3. `/api/admin-portal` → `ADMIN_SENSITIVE`.
4. Finish middleware skip quando `_reconPostValidationBlocked`.

---

## J. Arquivos alterados

- `securityRecon/engine/adminOperationalRoutePolicy.js` (novo)
- `securityRecon/engine/postValidationDecision.js`
- `securityRecon/engine/securityReconCorrelationEngine.js`
- `securityRecon/engine/routeExposurePolicy.js`
- `securityRecon/middleware/securityReconMiddleware.js`
- `tests/securityRecon/IMPETUS_SEC_RECON_GOV_001.test.js` (novo)

---

## Rodapé obrigatório

```
CAUSA RAIZ COMPROVADA: SIM
404 ORIGINADO NO ANTI-RECON: SIM
FALSO POSITIVO PÓS-AUTENTICAÇÃO: SIM
BLOQUEIO TRANSVERSAL DO ADMIN PORTAL: SIM
ROTAS REALMENTE INEXISTENTES IDENTIFICADAS: NÃO
RETRY/POLLING AMPLIFICAVA O PROBLEMA: SIM (PARCIAL)
ANTI-RECON REMOVIDO: NÃO
SECURITY_RECON_CORRELATION DESLIGADO: NÃO
BYPASS GLOBAL DE SUPER_ADMIN CRIADO: NÃO
RBAC ENFRAQUECIDO: NÃO
MOCKS PRODUTIVOS ADICIONADOS: NÃO
TESTE FUNCIONAL MULTIMÓDULO: PASS
TESTE NEGATIVO ANTI-RECON: PASS
```

Backend `impetus-backend` reiniciado via PM2.
