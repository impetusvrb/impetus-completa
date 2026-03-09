# Fase 3: Segurança - Implementação Concluída

## Resumo

A Fase 3 implementa camadas adicionais de segurança no backend, adequadas a ambientes industriais e conformidade com boas práticas (LGPD, OWASP).

---

## Backend

### 1. Utilitários de Segurança (`backend/src/utils/security.js`)

- **validatePassword**: Política de senha forte
  - Mínimo 8 caracteres, máximo 128
  - Obrigatório: letra maiúscula, minúscula e número
- **sanitizeString**: Prevenção XSS (remove `<>`, `javascript:`, handlers `on*`)
- **sanitizeSearchTerm**: Sanitização de termos de busca (remove `%`, `_`, `\` para evitar injection em LIKE)
- **normalizeEmail**: Normalização e validação de email
- **isValidUUID**: Validação de UUID

### 2. Schemas de Validação (`backend/src/utils/validation.js`)

- **loginSchema**: Email e senha (email normalizado)
- **registerSchema**: Nome, email, senha forte, company_id, lgpd_consent obrigatório
- **resetPasswordSchema**: Nova senha com política forte
- **validate(schema)**: Middleware que valida `req.body` e retorna 400 com detalhes em caso de erro
- **validateQuery(schema)**: Valida `req.query`

### 3. Rate Limiting (`backend/src/app.js`)

- **authLimiter**: 5 tentativas de login / 15 min (já existia)
- **registerLimiter**: 10 registros / hora por IP (novo)
- **apiLimiter**: 200 requisições / minuto por IP (proteção DDoS)
  - Skip em `/` e `/health`

### 4. Integrações

**Rotas de autenticação**
- `/api/auth/login`: `validate(loginSchema)` antes do handler
- `/api/auth/register`: `validate(registerSchema)` + rate limit

**Rotas admin**
- `/api/admin/users/:id/reset-password`: `validate(resetPasswordSchema)`
- Busca em users e logs: `sanitizeSearchTerm(search)` antes de usar em LIKE

### 5. Auditoria de Acesso Negado (`backend/src/middleware/auth.js`)

Quando `requireHierarchy`, `requirePermission` ou `sameCompanyOnly` retornam 403:
- Registro em `audit_logs` com:
  - `action: 'access_denied'`
  - `entity_type`: hierarchy | permission | company
  - `description`: motivo detalhado
  - `severity: 'warning'`
  - `success: false`

---

## Fluxo de Segurança

```
[Requisição] 
  → [apiLimiter] (200/min)
  → [authLimiter / registerLimiter] (rotas públicas)
  → [validate(schema)] (login, register, reset-password)
  → [requireAuth] → [requireHierarchy]
  → [logAction em 403]
  → [Handler com sanitizeSearchTerm em buscas]
```

---

## Variáveis de Ambiente (opcionais)

As políticas de senha e rate limits usam valores padrão. Para ajustar em produção, considere:
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- Política de senha em `utils/security.js` (PASSWORD_POLICY)

---

## Status: Concluído
