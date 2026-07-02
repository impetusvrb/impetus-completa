# ADR-009 — Licenciamento Desacoplado da Arquitetura Principal

**Status:** Aceite · **Implementado:** CERT-LICENSE-01 (2026-06-30)  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Relacionado:** ADR-003

---

## Contexto

Existe serviço de licença (`backend/src/services/license.js`) com validação remota HTTP e middleware **arquivado** (`_archived/middlewares/license.js`). Frontend possui `LicenseExpired.jsx`. Billing SaaS (Asaas/Stripe) é separado do licenciamento de produto. Stakeholders definiram: licenciamento remoto tratado em **CERT-LICENSE-01**, não nesta certificação.

---

## Problema

Como posicionar licenciamento na arquitectura Enterprise sem:

- Bloquear operação por dependência SaaS IMPETUS?
- Confundir licença de produto com subscription/billing?
- Acoplar enforcement ao core cognitivo?

---

## Decisão

**Desacoplar licenciamento da arquitectura principal:**

### Nesta certificação (ARCHITECTURE-01)

- Licenciamento é **módulo periférico**, não núcleo
- Core operacional + cognitivo **não depende** de validação remota para funcionar (estado actual: `LICENSE_VALIDATION_ENABLED=false` → valid=true)
- Artefactos futuros em `licenses/` (offline keys, grace period)
- Billing SaaS **desactivado** em Enterprise (ADR-003) — independente de licença produto

### CERT-LICENSE-01 (concluído)

- Offline Ed25519 em `IMPETUS_HOME/licenses/`
- Modos `local` / `remote` / `auto`
- Grace period configurável
- Middleware `licenseEnforcement.js` + CLI `license-admin.js`
- Capabilities únicas — **não** mistura com Asaas/subscription

### Proibição (ARCHITECTURE-01 — histórico)

- Enforcement não foi implementado em ARCHITECTURE-01 (adiado a LICENSE-01 — agora concluído)

---

## Consequências

### Positivas

- Enterprise pode operar enquanto LICENSE-01 não conclui (com acordo comercial)
- Separação clara: licença produto ≠ cobrança recorrente
- Flexibilidade para licenciador on-prem do cliente

### Negativas

- Gap temporal sem enforcement activo
- UI `LicenseExpired.jsx` órfã até LICENSE-01

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Licenciamento remoto obrigatório day-1 | Bloqueia air-gap; antecipa LICENSE-01 |
| Reutilizar Asaas como licenciamento | Confunde billing com licença produto |
| Embutir enforcement no Event Backbone | Acoplamento indevido |
| Remover `license.js` | Perde preparação existente |

---

## Referências

- `backend/src/services/license.js`
- `backend/_archived/middlewares/license.js`
- `.env.production.example` (LICENSE_*)
- CERT-ONPREM-FORENSICS-01, Parte 11
