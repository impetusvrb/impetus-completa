# CERT-LICENSE-01 — Licenciamento Enterprise Local

**Tipo:** Certificação de Implementação  
**Prioridade:** Crítica  
**Pré-requisitos:** FORENSICS-01 ✅ · ARCHITECTURE-01 ✅ · INFRA-01 ✅ · DATA-01 ✅  
**Data:** 2026-06-30  
**Status:** CERTIFICADO  
**ADR:** [ADR-009](./adrs/ADR-009-licenciamento-desacoplado.md)

---

## Sumário executivo

Consolidado o licenciamento **já existente** no projeto (`license.js`, middleware arquivado, `LicenseExpired.jsx`, variáveis `LICENSE_*`) numa camada Enterprise **offline**, assinada **Ed25519**, armazenada em `IMPETUS_HOME/licenses/`, com **grace period**, **capabilities** únicas e **CLI administrativa**.

**Não criado** sistema paralelo. **Não alterado:** RBAC, JWT, Event Backbone, Pulse, Controller, ANAM, Gêmeo Digital, regras de negócio cognitivas.

---

## PARTE 1 — Auditoria do sistema anterior

| Artefacto | Estado prévio | Evolução LICENSE-01 |
|-----------|---------------|---------------------|
| `backend/src/services/license.js` | Validação remota HTTP; `LICENSE_VALIDATION_ENABLED=false` → `valid: true` | Modos `local` \| `remote` \| `auto`; delegação a `enterpriseLicenseLocal.js` |
| `backend/_archived/middlewares/license.js` | Nunca montado em `server.js` | Substituído por `middleware/licenseEnforcement.js` (montado) |
| `frontend/src/pages/LicenseExpired.jsx` | UI pronta, órfã | Compatível: 403 + `code: LICENSE_INVALID` |
| `frontend/src/services/api.js` | Redirect em `LICENSE_INVALID` | Inalterado |
| Variáveis `LICENSE_*` | `.env.production.example` (SaaS remoto) | Expandidas (ver Parte 5) |
| Billing Asaas/Stripe | SaaS subscription | **Separado** — ADR-009 |

**Dependência SaaS remota:** preservada em `LICENSE_MODE=remote` para instalações cloud existentes.

---

## PARTE 2 — Modelo oficial de licença

Ficheiro JSON assinado (`impetus.license.json`):

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| `license_id` | ✅ | UUID único da licença |
| `installation_id` | ✅ | ID da instalação (`licenses/installation.id`) |
| `company_id` | ✅ | UUID da empresa (preservado ADR-001) |
| `company_name` | ✅ | Nome comercial |
| `plan` | ✅ | Ex.: `enterprise`, `professional` |
| `issued_at` | ✅ | ISO 8601 |
| `expires_at` | ✅ | ISO 8601 |
| `max_users` | ✅ | Limite de utilizadores licenciados |
| `capabilities` | ✅ | Array de capabilities (Parte 6) |
| `min_version` | ✅ | Versão mínima IMPETUS suportada |
| `signature_algorithm` | ✅ | `Ed25519` |
| `signature` | ✅ | Base64 da assinatura sobre payload canónico |

**Autenticidade:** verificada apenas por chave pública — **nunca** consulta à BD.

Payload canónico: chaves ordenadas alfabeticamente, sem `signature` / `signature_algorithm`, JSON estável (`enterpriseLicenseLocal.canonicalPayload`).

---

## PARTE 3 — Armazenamento

| Path | Conteúdo |
|------|----------|
| `${IMPETUS_HOME}/licenses/impetus.license.json` | Licença activa |
| `${IMPETUS_HOME}/licenses/installation.id` | Installation ID (gerado na 1.ª execução) |
| `${IMPETUS_HOME}/licenses/public.pem` | Chave pública (opcional; preferível a bundled) |

**Proibido:** licenças ou chaves privadas no repositório de código.

Sem `IMPETUS_HOME`: fallback legado `backend/licenses/` (compatibilidade dev).

---

## PARTE 4 — Validação local

Implementação: `backend/src/services/license/enterpriseLicenseLocal.js`

Validações offline:

1. Parse JSON / integridade ficheiro  
2. Assinatura Ed25519 (`LICENSE_PUBLIC_KEY` ou `LICENSE_PUBLIC_KEY_PATH` ou `licenses/public.pem`)  
3. `installation_id` vs `installation.id`  
4. `company_id` (opcional `expectedCompanyId`)  
5. `expires_at` + estados temporais  
6. Normalização de `capabilities`

**Sem HTTP obrigatório** em modo `local`.

---

## PARTE 5 — Grace period e estados

| Estado | Operacional | Bloqueia API* | Descrição |
|--------|:-----------:|:-------------:|-----------|
| `disabled` | ✅ | ❌ | `LICENSE_VALIDATION_ENABLED=false` |
| `valid` | ✅ | ❌ | Dentro da validade |
| `expiring_soon` | ✅ | ❌ | ≤ 30 dias até expirar |
| `grace` | ✅ | ❌ | Expirada, dentro do grace |
| `expired` | ❌ | ✅ | Pós grace |
| `invalid` | ❌ | ✅ | Assinatura / IDs incorrectos |
| `missing` | ⚠️ | configurável | Ficheiro ausente |

\*Quando `LICENSE_VALIDATION_ENABLED=true`.

### Variáveis de ambiente

| Variável | Default | Função |
|----------|---------|--------|
| `LICENSE_VALIDATION_ENABLED` | `false` | Activa enforcement (compatível SaaS) |
| `LICENSE_MODE` | `auto` | `local` \| `remote` \| `auto` |
| `LICENSE_FILE` / `LICENSE_FILE_PATH` | — | Override path da licença |
| `LICENSE_GRACE_PERIOD_DAYS` | `14` | Dias de tolerância pós-expiração |
| `LICENSE_PUBLIC_KEY` | — | PEM inline (\\n escapado) |
| `LICENSE_PUBLIC_KEY_PATH` | — | Path PEM |
| `LICENSE_BLOCK_WHEN_MISSING` | `false` | Bloquear sem ficheiro |
| `LICENSE_REMOTE_FAIL_OPEN` | `false` | SaaS: fail-open se servidor inacessível |
| `LICENSE_CACHE_TTL_MS` | `3600000` | Cache serviço |
| `LICENSE_MIDDLEWARE_CACHE_MS` | `300000` | Cache middleware |
| `LICENSE_KEY` / `IMPETUS_LICENSE_KEY` | — | Modo remoto SaaS |
| `LICENSE_SERVER_URL` / `LICENSE_API_KEY` | — | Validador remoto |
| `LICENSE_ISSUER_PRIVATE_KEY`* | — | **Só emissor IMPETUS** — nunca cliente |

\*Usado apenas em `license-admin.js issue` no ambiente de emissão.

---

## PARTE 6 — Capabilities

Camada única: `backend/src/services/license/licenseCapabilities.js`

| Capability | Descrição |
|------------|-----------|
| `core` | Núcleo operacional (sempre incluído) |
| `anam` | ANAM avatar/voz |
| `controller_advanced` | Controller Cognitivo avançado |
| `executive` | Executive cockpit |
| `executive_boardroom` | Boardroom |
| `digital_twin` | Gêmeo Digital |
| `voice_realtime` | Voice Realtime |
| `multi_site` | Multi-site (futuro) |
| `pulse_advanced` | Pulse analytics avançado |
| `workflow_advanced` | Workflow avançado |

API: `hasCapability(licenseResult, key)` — **não substitui RBAC**.

---

## PARTE 7 — Integração runtime

| Componente | Ficheiro | Alteração |
|------------|----------|-----------|
| Serviço unificado | `services/license.js` | Evoluído |
| Middleware | `middleware/licenseEnforcement.js` | Novo (evolução arquivado) |
| Rotas admin | `routes/systemLicense.js` | Novo |
| Server | `server.js` | Monta middleware + `/api/system/license` |
| Frontend | `LicenseExpired.jsx`, `api.js` | **Inalterado** |

Whitelist middleware: auth, health, webhooks, `/api/system/license`, ANAM public.

`req.license` disponível em requests API quando enforcement activo.

---

## PARTE 8 — Observabilidade

`backend/src/services/license/licenseObservability.js`

**Logs estruturados** (`[LICENSE]` JSON):

- `LICENSE_VALID`
- `LICENSE_GRACE`
- `LICENSE_VALIDATION_FAILED`

**Métricas in-memory:**

- `validations_total`, `validations_ok`, `validations_failed`
- `grace_active`, `last_state`, `last_capabilities_count`

Expostas em `/api/system/license/status` e CLI `enterprise:license status`.

---

## PARTE 9 — Administração CLI

```bash
cd backend
npm run enterprise:license -- status
npm run enterprise:license -- validate [--file=path]
npm run enterprise:license -- info
npm run enterprise:license -- import --file=/path/impetus.license.json
npm run enterprise:license -- issue --installation-id=...  # só emissor
```

Script: `scripts/enterprise/license-admin.js`

---

## PARTE 10 — Segurança

- ✅ Apenas chave **pública** na instalação cliente  
- ✅ Assinatura verificável localmente  
- ✅ Chave privada **proibida** no cliente (`LICENSE_ISSUER_PRIVATE_KEY` só emissor)  
- ✅ Permissões recomendadas: licença `0640`, directorio `0750`

---

## PARTE 11 — Compatibilidade

| Perfil | Comportamento |
|--------|---------------|
| **SaaS actual** | `LICENSE_VALIDATION_ENABLED=false` (default) — sem regressão |
| **SaaS remoto** | `LICENSE_MODE=remote` + `LICENSE_SERVER_URL` |
| **Enterprise** | `IMPETUS_HOME` + `LICENSE_MODE=local` + ficheiro assinado |
| **Dev legado** | Sem `IMPETUS_HOME`, validação desactivada |

`LicenseExpired.jsx` continua a responder a `403` / `LICENSE_INVALID`.

---

## PARTE 12 — Testes

```bash
cd backend && npm run test:license-enterprise
```

| Cenário | Resultado |
|---------|-----------|
| Licença válida assinada | ✅ |
| Licença expirada → grace | ✅ |
| Pós-grace bloqueia | ✅ |
| Assinatura inválida | ✅ |
| Installation ID incorreto | ✅ |
| Company ID incorreto | ✅ |
| Ficheiro corrompido | ✅ |
| Capabilities normalizadas | ✅ |
| Grace não bloqueia middleware | ✅ |
| `validation_disabled` via license.js | ✅ |

**Evidência:** 10 OK, 0 FAIL (2026-06-30).

CLI `enterprise:license status` executado com sucesso (modo `disabled`).

---

## PARTE 13 — Documentação entregue

| Documento | Path |
|-----------|------|
| Esta certificação | `backend/docs/CERT-LICENSE-01.md` |
| Manual Licenciamento | `backend/docs/enterprise/MANUAL-LICENSING.md` |
| Manual Renovação | `backend/docs/enterprise/MANUAL-LICENSE-RENEWAL.md` |
| Manual Recuperação | `backend/docs/enterprise/MANUAL-LICENSE-RECOVERY.md` |
| Matriz funcional | `backend/docs/FUNCTIONAL_MATRIX.md` (secção LICENSE) |
| Roadmap | `backend/docs/CERT-ONPREM-INFRA-01.md` Parte 14 |

---

## Ficheiros criados

| Ficheiro | Motivo |
|----------|--------|
| `src/services/license/enterpriseLicenseLocal.js` | Validação offline Ed25519 |
| `src/services/license/licenseCapabilities.js` | Catálogo único capabilities |
| `src/services/license/licenseObservability.js` | Logs + métricas |
| `src/services/license/licenseIssuer.js` | Emissão (ambiente IMPETUS) |
| `src/middleware/licenseEnforcement.js` | Enforcement HTTP (evolução arquivado) |
| `src/routes/systemLicense.js` | API status/import/refresh |
| `scripts/enterprise/license-admin.js` | CLI administrativa |
| `src/tests/licenseEnterpriseScenarios.js` | Testes automatizados |
| `docs/CERT-LICENSE-01.md` | Certificação |
| `docs/enterprise/MANUAL-LICENSING.md` | Operacional |
| `docs/enterprise/MANUAL-LICENSE-RENEWAL.md` | Renovação |
| `docs/enterprise/MANUAL-LICENSE-RECOVERY.md` | Recuperação |

## Ficheiros modificados

| Ficheiro | Motivo |
|----------|--------|
| `src/services/license.js` | Modos local/remote/auto; cache; grace |
| `src/server.js` | Montagem middleware + rotas |
| `package.json` | Scripts `enterprise:license`, `test:license-enterprise` |
| `docs/FUNCTIONAL_MATRIX.md` | Endpoints licença |
| `docs/CERT-ONPREM-INFRA-01.md` | Roadmap LICENSE ✅ |

## Não alterados (critério)

Event Backbone · Pulse · Controller · ANAM · Gêmeo Digital · RBAC · JWT · Docker · migrations cognitivas.

---

## Riscos remanescentes

1. **Enforcement desactivado por defeito** — activação requer decisão operacional (`LICENSE_VALIDATION_ENABLED=true`).
2. **Chave pública** — cliente deve receber `public.pem` da IMPETUS; bundled opcional ainda não incluído no repo.
3. **Capabilities vs UI** — gating por capability em rotas específicas fica para integração incremental (middleware só bloqueia licença global).
4. **`max_users`** — validado na licença; enforcement de contagem de users não implementado nesta certificação.

---

## Pendências

### CERT-ONPREM-CONTAINER-01 ✅

Concluído — volume `licenses/` mapeado via `${IMPETUS_HOME}:/opt/impetus` em `docker-compose.yml`.

### CERT-ONPREM-VALIDATION-01

- Smoke E2E com enforcement activo  
- Regressão SaaS remoto  
- Teste air-gapped completo  
- Validar redirect `LicenseExpired.jsx` em browser

---

## Critérios de aceite

| Critério | Estado |
|----------|--------|
| Evolui arquitectura existente (não duplica) | ✅ |
| Modelo licença formalizado | ✅ |
| Armazenamento `IMPETUS_HOME/licenses/` | ✅ |
| Validação offline | ✅ |
| Grace period configurável | ✅ |
| Capabilities únicas | ✅ |
| Integração runtime sem alterar cognitivo | ✅ |
| Observabilidade | ✅ |
| CLI admin | ✅ |
| Segurança (só chave pública cliente) | ✅ |
| Compatibilidade SaaS/Enterprise | ✅ |
| Testes executados | ✅ |
| Documentação | ✅ |

**CERT-LICENSE-01: CERTIFICADO**
