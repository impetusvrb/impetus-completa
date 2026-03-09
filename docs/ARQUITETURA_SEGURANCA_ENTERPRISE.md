# IMPETUS Comunica IA — Arquitetura de Segurança Enterprise

**Registro INPI:** BR512025007048-9  
**Stack:** Node.js, Express, PostgreSQL, JWT, Multi-tenant

---

## Fluxo obrigatório de segurança (IA)

```
Usuário
  → Auth Middleware (requireAuth)
  → Tenant Isolation (requireCompanyActive)
  → Prompt Firewall (análise pré-OpenAI)
  → Rate Limit (por usuário)
  → Context Builder (dados filtrados por permissão)
  → OpenAI
  → Audit Log (imutável)
  → Resposta
```

**A IA nunca acessa o banco diretamente.** O backend controla todo o contexto.

---

## 1. RBAC Avançado

### Tabelas

- **roles** — Papéis hierárquicos (ceo, diretor, gerente, coordenador, supervisor, colaborador)
- **permissions** — Permissões granulares (VIEW_FINANCIAL, VIEW_HR, VIEW_PRODUCTION, VIEW_STRATEGIC, VIEW_REPORTS, MANAGE_USERS, ACCESS_AI_ANALYTICS)
- **role_permissions** — Associação role ↔ permission

### Middleware

```javascript
const { authorize, authorizeAny } = require('../middleware/authorize');

router.get('/financeiro', requireAuth, authorize('VIEW_FINANCIAL'), handler);
router.get('/relatorios', requireAuth, authorizeAny('VIEW_REPORTS', 'VIEW_STRATEGIC'), handler);
```

### Fallback

Quando `roles` ou `permissions` não existem (antes da migração), o sistema concede permissão total para manter compatibilidade.

---

## 2. Multi-tenant real

- Todas as queries devem incluir `company_id = user.company_id`
- Middleware `requireTenantIsolation` garante `req.tenantContext.company_id`
- `requireCompanyActive` bloqueia acesso se empresa estiver inativa

### Helper

```javascript
const { tenantWhere } = require('../middleware/tenantIsolation');
const { where, params } = tenantWhere(req);
await db.query('SELECT * FROM communications WHERE ' + where, params);
```

---

## 3. Prompt Firewall

- Analisa a pergunta **antes** de chamar a OpenAI
- Bloqueia termos sensíveis (faturamento, lucro, salário, etc.) quando o usuário não tem permissão
- Bloqueia tentativas de prompt injection (ignore regras, bypass, jailbreak, etc.)
- Mensagem padrão: "Você não possui permissão para acessar informações estratégicas."

### Arquivo

`backend/src/middleware/promptFirewall.js`

---

## 4. Controle de contexto da IA

- `secureContextBuilder.buildContext(user, opts)` retorna contexto filtrado
- Nunca envia dados financeiros sem VIEW_FINANCIAL
- Nunca envia dados de RH sem VIEW_HR
- Nunca envia dados estratégicos sem VIEW_STRATEGIC
- Restrições explícitas no prompt quando permissão não existe

---

## 5. Auditoria imutável

### Tabela `ai_audit_logs`

- `user_id`, `company_id`, `action`, `question`, `response_preview`, `response_length`
- `blocked`, `block_reason`
- `ip_address`, `user_agent`, `created_at`

Triggers impedem UPDATE e DELETE. Toda interação com IA (incluindo bloqueios) é registrada.

---

## 6. JWT profissional

- **Access token:** 8 horas
- **Refresh token:** salvo no banco (`refresh_tokens`), revogável
- Logout invalida refresh token
- Middleware valida sessão ativa (sessions ou JWT conforme configuração)

*(A migração cria `refresh_tokens`. A integração completa com auth/login pode ser feita em etapa posterior.)*

---

## 7. Proteção de dados (LGPD)

- `utils/crypto.js` — AES-256-GCM para dados sensíveis em repouso
- Hash para senhas (bcrypt)
- `sensitive_fields_registry` — referência de campos criptografados
- `data_access_logs` — log de acesso a dados pessoais (já existente)

---

## 8. Rate limit e proteção contra abuso

- `user_rate_limits` — controle por usuário e janela temporal
- Limites: ai_chat 60/hora, executive_query 20/hora, smart_summary 10/hora
- Middleware `userRateLimit('ai_chat')` retorna 429 quando excedido

---

## Migração

```bash
node scripts/run-all-migrations.js
```

A migração `security_enterprise_migration.sql` cria:

- permissions, roles, role_permissions
- ai_audit_logs (com triggers de imutabilidade)
- refresh_tokens
- user_rate_limits
- sensitive_fields_registry

---

## Exemplos de uso

### Rota com RBAC

```javascript
router.get('/financeiro', requireAuth, authorize('VIEW_FINANCIAL'), async (req, res) => {
  const { companyId } = tenantWhere(req);
  const data = await db.query('SELECT * FROM financial WHERE company_id = $1', [companyId]);
  res.json({ ok: true, data: data.rows });
});
```

### Rota de chat (fluxo completo)

```javascript
router.post('/chat',
  requireAuth,
  requireCompanyActive,
  promptFirewall,
  userRateLimit('ai_chat'),
  async (req, res) => {
    if (req.promptFirewall?.blocked) {
      await aiAudit.logAIInteraction({ ...req.user, blocked: true, blockReason: req.promptFirewall.reason });
      return res.status(403).json({ ok: false, error: req.promptFirewall.message });
    }
    const ctx = await secureContextBuilder.buildContext(req.user, { companyId: req.user.company_id, queryText: req.body.message });
    // ... chamar OpenAI com ctx.context
    await aiAudit.logAIInteraction({ ...req.user, action: 'chat', question, response });
  });
```
