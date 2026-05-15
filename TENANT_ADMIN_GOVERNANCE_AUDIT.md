# IMPETUS — TENANT ADMIN GOVERNANCE AUDIT
**Auditoria Arquitectural de Governança Administrativa Multi-Tenant**

> **Fase:** Investigação e Modelagem Conceptual  
> **Produzido em:** 2026-05-10  
> **Status:** Apenas modelo — NÃO implementar sem aprovação arquitectural  
> **Regra absoluta:** Zero alteração em produção, auth, banco ou frontend nesta fase.

---

## SUMÁRIO EXECUTIVO

O IMPETUS opera hoje com um modelo **administrativo frágil e monocentrado** para cada tenant: existe um único administrador efectivo por empresa (criado por convite da equipa Impetus), sem mecanismo formal de:

- Múltiplos administradores por tenant
- Recuperação de acesso administrativo
- Protecção contra "último admin"
- Delegação de emergência
- Auditoria de transferência de governança

A situação representa um **risco de nível crítico** para a continuidade operacional de cada cliente. Este documento mapeia o estado actual, identifica os 10 cenários críticos de falha, propõe os modelos arquitecturais alternativos e define uma estratégia segura de evolução.

---

## PARTE 1 — AUDITORIA DA ARQUITECTURA ACTUAL

### 1.1 Modelo de Dados — Estado Real

#### Tabela `companies` (campos relevantes para governança)
```
id                        UUID PK
name                      TEXT
active                    BOOLEAN
tenant_status             TEXT   ('teste' | 'ativo' | 'suspenso' | 'cancelado')
founder_id                UUID → users (encontrado em código, sem DDL no repo ⚠️)
created_by_admin_id       UUID → admin_users (quem da equipa Impetus criou)
plan_type                 TEXT
subscription_tier         TEXT
contract_end_date         DATE
```

**Gap detectado:** `founder_id` é usado em `roleVerificationService.markCompanyRoot` mas **não tem migração SQL no repositório**. Risco de inconsistência entre ambientes.

#### Tabela `users` (campos relevantes para governança)
```
id                        UUID PK
company_id                UUID → companies
role                      TEXT   ('admin' | 'diretor' | 'gerente' | ... | 'internal_admin')
hierarchy_level           INTEGER  (0=CEO, 1=Diretor, 2=Gerente, ...)
is_company_root           BOOLEAN  — único campo de "ownership" canónico
company_role_id           UUID → company_roles  — cargo estrutural
permissions               JSONB   — permissões granulares ad hoc
active                    BOOLEAN
deleted_at                TIMESTAMPTZ
password_hash             TEXT   (NULL = conta por convite, não activada)
```

**Campo de ownership:** `is_company_root` é o único identificador canónico de "fundador/raiz", mas:
- Não equivale necessariamente a "tem acesso admin agora"
- Não há campo `is_tenant_admin` ou `tenant_admin_level`
- Múltiplos `is_company_root=true` são tecnicamente possíveis sem restrição UNIQUE

#### Tabela `admin_users` (portal Impetus — separada)
```
id          UUID PK
email       TEXT UNIQUE
senha_hash  TEXT
perfil      TEXT  ('super_admin' | 'admin_comercial' | 'admin_suporte')
ativo       BOOLEAN
```

**Importante:** Esta tabela é **completamente separada** dos tenants. É o plano de identidade da equipa Impetus, com JWT de tipo `'impetus_admin'` — não confundir com admin do tenant.

---

### 1.2 Dois Planos de Identidade — Arquitectura Dual

```
┌───────────────────────────────────────────────────────────────┐
│                    PLANO A: Impetus Staff                     │
│  admin_users (super_admin / admin_comercial / admin_suporte)  │
│  JWT typ='impetus_admin'  —  porta /api/impetus-admin         │
└───────────────────────────────────────────────────────────────┘
                              │
                  acção de provisionamento
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    PLANO B: Tenants (Clientes)                │
│   users  (role=admin | diretor | gerente | ... | collab)      │
│   JWT typ='session'  —  porta /api/*                          │
│   Separação por company_id  —  RBAC híbrido                  │
└───────────────────────────────────────────────────────────────┘
```

Esta separação é correcta arquitecturalmente. O risco está **dentro do Plano B**: a fragilidade do modelo de admin por tenant.

---

### 1.3 Como um Admin "Nasce" — Três Caminhos Inconsistentes

#### Caminho A — Registo Público (`POST /api/companies`)
- Cria empresa + utilizador com `role = 'diretor'` (NÃO `admin`)
- `hierarchy_level = 1`
- `is_company_root` **NÃO** marcado neste fluxo
- **Problema:** O "fundador" do tenant entra como `diretor`, não como `admin`

#### Caminho B — Painel Impetus (`POST /api/impetus-admin/companies`)
- Cria empresa + convite ao admin com `role = 'admin'`, `hierarchy_level = 1`, `is_company_root = true`
- `password_hash = NULL` → conta activada via token de reset de password
- Chama `markCompanyRoot` após commit
- **Problema:** Se o e-mail de convite não chegar, a conta fica em limbo (hash NULL, não activada)

#### Caminho C — `setupCompany.js`
- **Não está montado em `server.js`** — fluxo inexistente em produção
- **Problema:** Risco de documentação/processo referir este caminho sem efeito real

**Conclusão:** Não há um fluxo único e canónico de criação de admin de tenant. Isto é um gap de governança fundamental.

---

### 1.4 Como `role = 'admin'` é Atribuído

| Via | Quem pode fazer | Observação |
|---|---|---|
| Painel Impetus | `super_admin` / `admin_suporte` | Único caminho oficial para criar `role='admin'` |
| CRUD `/api/admin/users` | Admin tenant | Enum Zod **não inclui `'admin'`** — impossível promover via produto |
| SQL directo | Dev/DBA Impetus | Workaround — sem auditoria de produto |
| `contextual_capabilities` | Automático por `company_role_name` | Capabilities sem `role='admin'` — via env flag |

**Gap crítico:** Um admin de tenant **não pode** promover outro utilizador a `role='admin'` através da interface normal do produto. Toda criação de novo admin formal depende de intervenção da equipa Impetus.

---

### 1.5 Como um Admin "Perde" Acesso

| Evento | Caminho de Perda | Reversibilidade Actual |
|---|---|---|
| Esquece password | `forgot-password` → reset token | ✅ Self-service |
| Conta desactivada (`active=false`) | Admin desactiva a si próprio? → bloqueado. Outro admin desactiva? | Sem salvaguarda de "último admin" |
| `role` alterado de `admin` para outro | Potencial se Impetus intervém via SQL | Requer intervenção Impetus |
| `hierarchy_level` elevado (>1) | `requireHierarchy(1)` bloqueia | Requer intervenção Impetus |
| E-mail comprometido | Reset password por atacante | Sem 2FA obrigatório |
| `company_role_id` liga a cargo sem capability | Capability `system_administration` removida contextualmente | Reversão por env flag ou SQL |
| Empresa suspensa (`tenant_status=suspenso`) | Todos os utilizadores bloqueados | Requer intervenção Impetus comercial |

**Gap crítico:** Não existe uma query do tipo `COUNT admins > 1` antes de desactivar/despromover um admin. Não existe "last admin protection".

---

### 1.6 Mecanismos de Recuperação Existentes

| Mecanismo | Abrangência | Limitações |
|---|---|---|
| `forgot-password` email | Individual (qualquer user) | Depende de acesso ao e-mail |
| `resend-admin-invite` (portal Impetus) | Conta com `password_hash=NULL` | Apenas contas por convite não activadas |
| Intervenção SQL da equipa Impetus | Qualquer cenário | Manual, sem workflow, sem auditoria de produto |
| Activação da empresa por `admin_suporte` | Tenant suspenso/bloqueado | Processo comercial informal |

**Gap crítico:** Não existe um **"tenant recovery workflow"** formal, documentado, auditado e com aprovação multi-step.

---

### 1.7 Gap de Segurança Identificado: Settings Abertos

```javascript
// backend/src/routes/admin/settings.js
router.get('/company', requireAuth, ...)  // ← sem requireHierarchy ou requireTenantAdminRole
router.put('/company', requireAuth, ...)  // ← qualquer utilizador autenticado pode alterar
```

**Risco imediato:** Qualquer utilizador com sessão válida pode ler e alterar configurações da empresa. Este gap não é parte do modelo de admin, mas é consequência da inconsistência de gates — e deve ser corrigido independentemente desta fase.

---

## PARTE 2 — CENÁRIOS CRÍTICOS DE FALHA

### Cenário 1 — Admin bloqueia a si próprio
**Gatilho:** Admin altera a sua `hierarchy_level` para 2+ via SQL ou painel Impetus
**Consequência:** `requireHierarchy(1)` passa a bloquear todas as rotas admin
**Situação actual:** Sem bypass automático. Requer intervenção Impetus.

### Cenário 2 — Admin perde capabilities contextuais
**Gatilho:** `company_role_id` é actualizado para um cargo sem correspondência no `IMPETUS_SYSTEM_ADMIN_ROLE_SUBSTR`
**Consequência:** `system_administration` capability removida. Menus admin desaparecem. Rotas bloqueadas.
**Situação actual:** Reversível via env flag, mas sem alerta ou mecanismo automático.

### Cenário 3 — Admin perde hierarchy (role textual alterado)
**Gatilho:** `role` alterado de `admin` para `diretor` via Impetus Admin ou SQL
**Consequência:** `requireTenantAdminRole` bloqueia (só aceita `role='admin'` ou capability)
**Situação actual:** Sem salvaguarda. `isAdministrador()` frontend aceitaria `diretor` — mas backend bloqueia.

### Cenário 4 — Admin sai da empresa
**Gatilho:** Utilizador desactivado (`active=false`) ou `deleted_at` preenchido
**Consequência:** Token invalida. Sessões expiram. Tenant sem admin activo.
**Situação actual:** Sem detecção automática. Sem alerta. Sem recovery trigger.

### Cenário 5 — Empresa perde único admin (tenant órfão)
**Gatilho:** Combinação dos Cenários 1–4
**Consequência:** Empresa **completamente** sem capacidade de administração self-service
**Situação actual:** Dependência total de intervenção manual da equipa Impetus. Sem SLA. Sem processo formal.

### Cenário 6 — Role/cargo alterado incorrectamente
**Gatilho:** Admin actualiza o próprio `company_role_id` para um cargo operacional (ex.: Supervisor)
**Consequência:** Capabilities `system_administration` removidas; sidebar e rotas admin desaparecem
**Situação actual:** Sem validação de auto-demoção de capabilities ao alterar cargo.

### Cenário 7 — Tenant fica órfão após suspend/cancel
**Gatilho:** `tenant_status` muda para `suspenso` → `cancelado` sem transferência de dados/governança
**Consequência:** Todos os dados presos, nenhum utilizador consegue aceder
**Situação actual:** Sem workflow de "offboarding gracioso" ou exportação de dados.

### Cenário 8 — Suporte precisa recuperar tenant urgente
**Gatilho:** Cliente entra em contacto com suporte urgente fora do horário comercial
**Consequência:** `admin_suporte` no portal Impetus pode criar convite, mas sem workflow formal de validação de identidade
**Risco:** Engenharia social poderia forçar reset de acesso de tenant legítimo.

### Cenário 9 — Empresa solicita novo admin (onboarding de substituição)
**Gatilho:** Admin principal sai. Empresa quer dar acesso admin a outro colaborador.
**Consequência:** Processo actual: contactar Impetus → criar convite via painel → activar conta
**Gap:** Não existe delegação self-service segura de "promover a admin".

### Cenário 10 — Conta principal comprometida (ataque)
**Gatilho:** Credenciais do admin vazadas. Atacante acede ao tenant.
**Consequência:** Sem 2FA obrigatório, sem revogação de sessões activas em cascata, sem alerta de acesso suspeito
**Situação actual:** `forgot-password` apenas; sem detecção de acesso anómalo.

---

## PARTE 3 — SEPARAÇÃO CONCEPTUAL: TENANT ADMINISTRATOR ≠ CARGO ORGANIZACIONAL

### O Problema da Confusão Actual

O IMPETUS hoje usa `role='admin'` para dois conceitos distintos:

```
CONCEITO A — Cargo Organizacional
══════════════════════════════════
"Administrador do Sistema" como cargo na empresa cliente.
Pode ser o diretor, um supervisor, um colaborador de TI.
Definido em company_roles.
Contextual, organizacional, muda com a empresa.

CONCEITO B — Privilégio de Tenant
══════════════════════════════════
"Tenant Administrator" — quem tem controlo técnico do tenant no IMPETUS.
NÃO é um cargo. É uma concessão de privilégio plataforma.
Pode (ou não) coincidir com um cargo organizacional.
Independente de hierarquia organizacional.
Não muda com reestruturações da empresa.
```

### Modelo Proposto: Separação Conceptual

```
┌─────────────────────────────────────────────────────────────┐
│                  TENANT PRIVILEGE LAYER                     │
│  (separado da identidade organizacional)                    │
│                                                             │
│  tenant_admins                                              │
│  ├── user_id         → users.id                             │
│  ├── company_id      → companies.id                         │
│  ├── level           TEXT  ('primary' | 'secondary' |       │
│  │                          'recovery' | 'emergency')       │
│  ├── granted_by      → user_id ou admin_user_id             │
│  ├── granted_at      TIMESTAMPTZ                            │
│  ├── expires_at      TIMESTAMPTZ NULL                       │
│  ├── active          BOOLEAN                                │
│  └── revoked_at      TIMESTAMPTZ NULL                       │
│                                                             │
│  Regra: 1 empresa DEVE ter no mínimo 1 admin activo         │
│  (enforçado por trigger ou application logic)               │
└─────────────────────────────────────────────────────────────┘
         │
         │  "é admin de tenant" — concessão explícita
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  ORGANIZATIONAL IDENTITY                    │
│  users.role | users.hierarchy_level | company_role_id       │
│  (determinam menus, visibilidade, orquestração)             │
│  NÃO determinam acesso admin de plataforma                  │
└─────────────────────────────────────────────────────────────┘
```

Esta separação resolve o problema central: um utilizador pode ser admin de plataforma (tenant admin) independentemente do seu cargo organizacional (diretor, supervisor, colaborador de TI).

---

## PARTE 4 — MODELOS POSSÍVEIS (ANÁLISE)

### Modelo A — 1 Admin Único (Estado Actual)

```
Empresa → 1 admin → controlo total
```

**Vantagens:** Simples, já implementado, responsabilidade clara.  
**Riscos:** Todos os Cenários 1–10 aplicam-se na íntegra. Single point of failure total.  
**Recomendação:** Abandonar. Risco inaceitável para SaaS enterprise.

---

### Modelo B — Múltiplos Tenant Admins (Recomendado para base)

```
Empresa → N admins → qualquer um pode administrar
         └── primary admin (1, é_company_root)
         └── secondary admins (N, sem limite mínimo/máximo definido)
```

**Vantagens:** Redundância básica. Simples de implementar. Sem workflow complexo.  
**Riscos:** Sem hierarquia de recovery. Se todos saírem ao mesmo tempo, ainda é tenant órfão. Governança de "quem pode promover admin" precisa de ser definida.  
**Considerações de implementação:**
- `tenant_admins` table ou campo `is_tenant_admin BOOLEAN` em `users`
- Gate "last admin protection": impedir remoção se COUNT(activos) <= 1
- Self-service: admin primário pode promover outros a admin (com auditoria)

---

### Modelo C — Admin Primário + Recovery Admin (Recomendado para fase 1)

```
Empresa → 1 primary admin (full control)
        → 1 recovery admin (acesso só em emergency)
        → N secondary admins (optional)
```

**Vantagens:** Protecção directa contra Cenários 4–5. Recovery admin activa só quando primary indisponível. Simples de comunicar ao cliente.  
**Riscos:** Recovery admin pode ser esquecido/não configurado. Necessita de UI para configurar.  
**Gate:** Primary admin não pode ser removido sem promover outro a primary primeiro.  
**Recomendação:** Implementar como fase 1 evolutiva.

---

### Modelo D — Suporte Master + Delegated Recovery (Recomendado para SaaS maduro)

```
Impetus Admin (super_admin)
  └── pode criar recovery token com aprovação multi-step
       └── cliente valida identidade (email + phone + código contrato)
            └── tenant recovery token criado com TTL curto
                 └── novo admin activado
```

**Vantagens:** Segurança máxima. Rastreabilidade completa. Protege contra engenharia social.  
**Riscos:** Mais complexo de implementar. Requer UI para workflow de aprovação. Depende de processo operacional Impetus.  
**Recomendação:** Implementar como fase 2 evolutiva, após Modelo C estável.

---

### Modelo E — Emergency Recovery Workflow (para fase 3 futura)

```
Empresa detecta "sem admin" → abre ticket →
Impetus valida identidade multi-factor (e-mail + CNPJ + contrato + phone) →
aprovação por 2 admins Impetus →
emergency token gerado (TTL: 24h, single-use) →
cliente define novo admin →
auditoria completa registada →
alerta para todos os e-mails registados na empresa
```

**Vantagens:** Processo seguro e auditável. Protecção LGPD. Sem dependência de SQL manual.  
**Riscos:** Demora do processo pode ser bloqueante em emergências. Requer maturidade operacional.  
**Recomendação:** Meta de longo prazo.

---

## PARTE 5 — MECANISMO DE RECUPERAÇÃO PROPOSTO

### Fluxo de Recovery (Modelo C+D)

```
1. DETECÇÃO
   ┌──────────────────────────────────────┐
   │  Cliente sem acesso administrativo  │
   └──────────────────┬───────────────────┘
                      │
   2. VALIDAÇÃO DE IDENTIDADE
   ┌──────────────────▼───────────────────┐
   │  Canal: email do contrato            │
   │  + CNPJ da empresa                   │
   │  + nome do responsável contractual   │
   │  (dados de companies.email_responsavel│
   │   e companies.cnpj)                  │
   └──────────────────┬───────────────────┘
                      │
   3. APROVAÇÃO INTERNA IMPETUS
   ┌──────────────────▼───────────────────┐
   │  admin_suporte confirma identidade   │
   │  + segundo admin_comercial aprova    │
   │  (dual approval para acções críticas)│
   └──────────────────┬───────────────────┘
                      │
   4. CRIAÇÃO DE RECOVERY TOKEN
   ┌──────────────────▼───────────────────┐
   │  Token único gerado                  │
   │  TTL: 2 horas                        │
   │  Single-use                          │
   │  Registo em audit_log                │
   │  E-mail para TODOS os contactos da   │
   │  empresa (alerta de acção sensível)  │
   └──────────────────┬───────────────────┘
                      │
   5. ACTIVAÇÃO PELO CLIENTE
   ┌──────────────────▼───────────────────┐
   │  Cliente acede /recovery?token=...   │
   │  Define novo admin (email + password)│
   │  is_tenant_admin=true atribuído      │
   │  audit log: recovery_complete        │
   └──────────────────────────────────────┘
```

### Requisitos LGPD do Fluxo de Recovery

1. **Mínimo de dados necessário:** Validação de identidade sem acesso ao conteúdo operacional da empresa
2. **Rastreabilidade:** `tenant_recovery_log(id, company_id, requested_by, approved_by_1, approved_by_2, action, created_at, completed_at)`
3. **Notificação obrigatória:** Todos os contactos registados da empresa devem ser notificados de qualquer acção de recovery
4. **Retenção de audit:** Registos de recovery devem ser mantidos por tempo superior ao de dados operacionais (recomendado: 5 anos)
5. **Revogação de sessões:** No recovery, todas as sessões activas do tenant são invalidadas automaticamente

---

## PARTE 6 — IMPACTO ARQUITECTURAL

### Auth & JWT
| Componente | Impacto |
|---|---|
| `validateSession` | Precisa consultar `tenant_admins` para `is_tenant_admin` além de `users.role` |
| JWT payload | Adicionar claim `tenant_admin_level` ('primary'/'secondary'/'none') |
| `requireTenantAdminRole` | Simplificar: consultar `tenant_admins.active` em vez de múltiplas heurísticas |
| Session invalidation | Recovery deve invalidar todas as sessões do tenant |

### Hierarchy & RBAC
| Componente | Impacto |
|---|---|
| `requireHierarchy(1)` | Substituir por `requireTenantAdmin` baseado em `tenant_admins` |
| `contextualSystemAdminService` | Manter para capabilities organizacionais; separar de "é tenant admin" |
| `isAdministrador()` frontend | Simplificar: ler `user.is_tenant_admin` de localStorage |
| `isStrictAdminRole()` | Simplificar: `user.tenant_admin_level !== null` |

### Onboarding
| Componente | Impacto |
|---|---|
| `POST /api/companies` | Criar registo em `tenant_admins` para o fundador |
| `POST /api/impetus-admin/companies` | Idem para admin por convite |
| Unificação de fluxos | Oportunidade de ter UM fluxo canónico de criação de admin |

### Frontend
| Componente | Impacto |
|---|---|
| `useVisibleModules` | Ler `tenant_admin_level` de `/dashboard/me` |
| `AdminRouteGuard` | `is_tenant_admin=true` em localStorage |
| `resolveMenuRole` | Retornar 'admin' se `is_tenant_admin` |
| Settings admin | Mostrar secção "Gestão de Administradores" apenas para primary admin |

### Governance Dashboard
| Componente | Impacto |
|---|---|
| CognitiveGovernanceDashboard | Adicionar widget "Saúde Administrativa" (n.º admins activos, último acesso admin) |
| Alertas | Alerta se empresa tiver apenas 1 admin activo |
| Auditoria | `tenant_admin_changes` no log de auditoria |

---

## PARTE 7 — ARQUITECTURA RECOMENDADA (Esquema Evolutivo)

### Schema Proposto (NÃO implementar agora)

```sql
-- Tabela central de privilégios de admin de tenant
CREATE TABLE tenant_admins (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  user_id           UUID NOT NULL REFERENCES users(id),
  level             TEXT NOT NULL CHECK (level IN ('primary', 'secondary', 'recovery', 'emergency')),
  granted_by_user   UUID REFERENCES users(id),          -- admin que concedeu (tenant)
  granted_by_admin  UUID REFERENCES admin_users(id),    -- staff Impetus que concedeu
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,                        -- NULL = permanente
  active            BOOLEAN NOT NULL DEFAULT true,
  revoked_at        TIMESTAMPTZ,
  revoked_by        UUID,
  revoke_reason     TEXT,
  recovery_token    TEXT,                               -- token de recovery single-use
  recovery_expires  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices críticos
CREATE UNIQUE INDEX idx_tenant_admins_company_user 
  ON tenant_admins (company_id, user_id) WHERE active = true;

CREATE INDEX idx_tenant_admins_company_active 
  ON tenant_admins (company_id, active, level);

-- Log de auditoria de recovery (retenção longa)
CREATE TABLE tenant_recovery_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  action          TEXT NOT NULL,   -- 'recovery_requested' | 'identity_validated' | 'approved' | 'completed' | 'rejected'
  requested_by    TEXT,            -- e-mail do solicitante externo
  approved_by_1   UUID REFERENCES admin_users(id),
  approved_by_2   UUID REFERENCES admin_users(id),
  target_user_id  UUID,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: empresa não pode ficar sem admin primário activo
-- (Implementar como trigger ou application-level check)
-- Regra: DELETE/UPDATE em tenant_admins WHERE level='primary' AND active=true
--        deve verificar COUNT activos restantes > 0
```

### Constraint Crítica: "Last Admin Protection"

```sql
-- Função de trigger (exemplo conceptual)
CREATE OR REPLACE FUNCTION prevent_last_admin_removal()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.active = true AND NEW.active = false) OR TG_OP = 'DELETE' THEN
    IF (
      SELECT COUNT(*) FROM tenant_admins
      WHERE company_id = OLD.company_id
        AND active = true
        AND id != OLD.id
    ) = 0 THEN
      RAISE EXCEPTION 'LAST_ADMIN_PROTECTION: não é possível remover o único administrador activo do tenant %', OLD.company_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_admins_last_admin_check
  BEFORE UPDATE OR DELETE ON tenant_admins
  FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_removal();
```

---

## PARTE 8 — ESTRATÉGIA DE MIGRAÇÃO SEGURA (Fases)

### Fase 0 — Prerequisitos (Antes de qualquer implementação)
- [ ] Corrigir `settings.js` `GET/PUT /company` — adicionar `requireTenantAdminRole` imediatamente
- [ ] Criar migração para `founder_id` em `companies` (coluna já usada no código)
- [ ] Documentar processo actual de criação de admin via painel Impetus
- [ ] Inventariar tenants existentes: quantos têm `role='admin'`? Quantos têm apenas `diretor`?

### Fase 1 — Modelo C: Primary + Recovery Admin
**Duração estimada:** 2–3 sprints  
**Âmbito:**
- Criar tabela `tenant_admins`
- Migrar dados: todos os `users` com `role='admin'` OU `is_company_root=true` → `tenant_admins(level='primary')`
- `requireTenantAdminRole` passa a consultar `tenant_admins` (com fallback para `role='admin'` em modo compatibilidade)
- UI: painel "Gestão de Administradores" (apenas primary admin vê)
- Endpoint: `POST /api/admin/tenant-admins` — promover secondary
- Endpoint: `DELETE /api/admin/tenant-admins/:id` — revogar (com last-admin check)
- Alerta: email quando empresa fica com apenas 1 admin activo
- Flag: `IMPETUS_TENANT_ADMIN_V2=false` (off por default, activar por empresa)

### Fase 2 — Modelo D: Suporte Master + Recovery Workflow
**Duração estimada:** 3–4 sprints  
**Âmbito:**
- Tabela `tenant_recovery_log`
- Endpoint portal Impetus: `POST /api/impetus-admin/tenant-recovery/initiate`
- Workflow de dual approval (`admin_suporte` + `admin_comercial`)
- Recovery token com TTL + single-use
- Invalidação de sessões no recovery
- Notificação por e-mail a todos os contactos da empresa

### Fase 3 — Modelo E: Emergency Access + 2FA Recovery
**Duração estimada:** 4–5 sprints  
**Âmbito:**
- 2FA obrigatório para contas com `tenant_admins.level='primary'`
- `emergency` level com TTL curto (24h) e auto-revogação
- Portal de self-service para cliente iniciar recovery (com validação de identidade)
- Alertas automáticos de anomalia de acesso admin
- Dashboard Impetus: saúde administrativa de todos os tenants

---

## PARTE 9 — RISCOS DA IMPLEMENTAÇÃO

| Risco | Severidade | Mitigação |
|---|---|---|
| Migração de dados: identificar admins actuais | Alta | Inventário manual antes da migração + fallback `role='admin'` |
| Breaking change em `requireTenantAdminRole` | Alta | Flag `IMPETUS_TENANT_ADMIN_V2` + modo compatibilidade |
| Tenant sem nenhum admin após migração | Crítica | Query de validação pré-migração. Mínimo 1 admin garantido. |
| Performance: query `tenant_admins` em cada request | Média | Cache em JWT payload (`tenant_admin_level`) |
| Engenharia social no recovery workflow | Alta | Dual approval obrigatório + notificação de todos os contactos |
| LGPD: log de recovery contém dados pessoais | Alta | Retenção separada + criptografia + acesso restrito |

---

## PARTE 10 — RECOMENDAÇÕES IMEDIATAS (sem esperar implementação)

Estas acções podem ser feitas **hoje** sem esperar a implementação completa:

### Prioridade CRÍTICA (esta semana)
1. **Corrigir `admin/settings.js`** — adicionar `requireTenantAdminRole` às rotas GET/PUT `/company`
2. **Processo operacional documentado:** Impetus deve ter SLA e checklist para pedidos de recovery de tenant

### Prioridade ALTA (próximas 2 semanas)
3. **Inventário de tenants:** identificar quais empresas têm apenas 1 admin activo
4. **Migração `founder_id`:** criar migração SQL para a coluna já usada no código
5. **Alerta proactivo:** comunicar a tenants com 1 único admin para configurar segundo admin (mesmo com o sistema actual)

### Prioridade MÉDIA (próximo mês)
6. **Design doc Fase 1:** especificação detalhada da tabela `tenant_admins` com casos de borda
7. **RFC interna:** discussão dos modelos B/C para alinhamento de equipa antes de implementar
8. **Testes de smoke para Cenários 1–10:** scripts de validação para verificar comportamento actual

---

## APÊNDICE A — Mapa de Ficheiros Relevantes para Implementação Futura

```
backend/src/
├── middleware/
│   └── auth.js                    — requireTenantAdminRole, requireHierarchy (alterar)
├── routes/
│   ├── auth.js                    — login, forgot-password (adicionar tenant_admin_level no JWT)
│   ├── admin/
│   │   ├── users.js               — CRUD de utilizadores (adicionar gestão tenant_admins)
│   │   └── settings.js            — GAP CRÍTICO: adicionar gate imediato
│   └── impetusAdmin/
│       └── companies.js           — criação de admin (migrar para tenant_admins)
├── services/
│   ├── contextualSystemAdminService.js   — manter para capabilities organizacionais
│   └── [NOVO] tenantAdminService.js      — serviço central de gestão de admins
└── migrations/
    └── [NOVO] tenant_admins_migration.sql
    
frontend/src/
├── utils/
│   └── roleUtils.js               — isStrictAdminRole (simplificar com is_tenant_admin)
├── hooks/
│   └── useVisibleModules.js       — ler tenant_admin_level
├── App.jsx                        — AdminRouteGuard (usar is_tenant_admin)
└── pages/
    └── [NOVO] AdminTenantAdmins.jsx  — UI de gestão de administradores do tenant
```

---

## APÊNDICE B — Glossário

| Termo | Definição |
|---|---|
| **Tenant** | Uma empresa cliente no IMPETUS (isolamento por `company_id`) |
| **Tenant Admin** | Utilizador com privilégio de gestão da plataforma para o seu tenant |
| **Primary Admin** | O administrador principal, com capacidade de promover outros admins |
| **Recovery Admin** | Admin de backup, activado quando primary está indisponível |
| **Emergency Access** | Acesso temporário concedido pela equipa Impetus após validação de identidade |
| **is_company_root** | Campo legacy que marca o fundador/primeiro utilizador (não equivale a admin activo) |
| **Tenant Orphan** | Empresa sem nenhum admin activo — cenário de recuperação necessária |
| **Last Admin Protection** | Mecanismo que impede remoção do último admin activo de um tenant |
| **Dual Approval** | Processo onde 2 membros da equipa Impetus devem aprovar uma acção crítica de recovery |

---

*Este documento é um modelo arquitectural de investigação. Nenhuma alteração de produção deve ser feita com base neste documento sem passar pelo processo formal de RFC, aprovação arquitectural e plano de migração de dados.*

**Versão:** 1.0  
**Revisão prevista:** Antes do início da implementação da Fase 1  
**Responsável:** Arquitecto Principal IMPETUS
