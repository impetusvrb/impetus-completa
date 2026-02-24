# Segurança Anti-Hacker - Proteção OWASP, Criptografia e Dependências

## Resumo

Implementações de segurança para reduzir risco de hacking, exposição de dados e proteção da reputação.

---

## 1. OWASP Top 10 - Correções Implementadas

### SQL Injection
- **logs.js:** O parâmetro `days` era interpolado na query (`interval '${days} days'`). Corrigido para uso de query parametrizada: `($2::integer || ' days')::interval` com `safeInteger()`.
- **Todos os db.query:** Uso de placeholders (`$1`, `$2`, etc.) e arrays de parâmetros. Nenhuma concatenação de user input em SQL.

### Cross-Site Scripting (XSS)
- **security.js:** Novas funções `escapeHtml()` e `sanitizeString()` para sanitização.
- **diag_report.js:** Todo conteúdo dinâmico (text, report, refs) escapado com `escapeHtml()` antes de inserir em HTML.
- **sanitizeSearchTerm:** Já existente – remove `%`, `_`, `\` em termos de busca (proteção LIKE).
- **Frontend:** React escapa automaticamente em JSX. Evitar `dangerouslySetInnerHTML` com dados do usuário.

### Broken Access Control
- **diag_report.js:** Adicionado `requireAuth` – rota protegida.
- **Rotas admin:** `requireAuth` + `requireHierarchy(2)` ou `(1)` conforme necessidade.
- **company_id:** Todas as queries filtram por `req.user.company_id` – isolamento multi-tenant.
- **Validação de UUID:** `isValidUUID()` em rotas que recebem IDs.

### Validação de Entrada
- **safeInteger():** Limita e valida inteiros (ex: days entre 1–365).
- **Zod:** Validação de body em login, register, reset-password, create/update user.
- **normalizeEmail():** Normalização de e-mail.

---

## 2. Criptografia

### Senhas (BCrypt)
- **Biblioteca:** bcryptjs com **12 rounds** (2^12 iterações).
- **Padrão NIST:** Resistente a rainbow tables e ataques de força bruta.
- **Argon2:** Pode ser adotado no futuro; BCrypt permanece como opção estável.

### Dados Sensíveis em Repouso (AES-256-GCM)
- **Módulo:** `backend/src/utils/crypto.js`
- **Algoritmo:** AES-256-GCM (autenticado).
- **Uso:** Tokens Z-API (`instance_token`, `client_token`).
- **Variável de ambiente:** `ENCRYPTION_KEY` (mín. 32 caracteres).

**Quando `ENCRYPTION_KEY` está definida:**
- Salvamento: tokens são criptografados antes de gravar.
- Leitura: tokens são descriptografados ao buscar (zapi service).
- Dados antigos sem criptografia: continuam legíveis (backward compatible).

**Gerar chave:**
```bash
openssl rand -base64 32
```

---

## 3. Dependências - Auditoria e Versões Recomendadas

### Backend (package.json)

| Pacote | Versão Atual | Notas |
|--------|--------------|-------|
| express | ^4.18.2 | Atualizar para 4.21.x+ (patches de segurança) |
| axios | ^1.4.0 | Atualizar para 1.7.x+ |
| pg | ^8.10.0 | Manter 8.x atualizado |
| bcryptjs | ^2.4.3 | OK – sem dependências nativas |
| helmet | ^7.1.0 | OK |
| zod | ^3.22.4 | OK |
| uuid | ^9.0.0 | OK |
| pdf-parse | ^1.1.1 | Verificar CVEs – considerar alternativas |
| multer | ^1.4.5-lts.1 | OK |
| dotenv | ^16.0.0 | OK |
| express-rate-limit | ^7.1.5 | OK |

### Frontend (package.json)

| Pacote | Versão Atual | Notas |
|--------|--------------|-------|
| react | ^18.2.0 | OK |
| react-dom | ^18.2.0 | OK |
| react-router-dom | ^6.20.0 | OK |
| axios | ^1.6.0 | Atualizar para 1.7.x+ |
| recharts | ^2.10.0 | OK |
| lucide-react | ^0.294.0 | OK |
| date-fns | ^2.30.0 | OK |
| vite | ^5.0.0 | OK |

### Comandos de Auditoria

```bash
# Backend
cd backend
npm audit
npm audit fix

# Frontend
cd frontend
npm audit
npm audit fix
```

### Atualização para Versões Seguras

```bash
npm update
npm audit fix --force  # Usar com cautela – pode quebrar compatibilidade
```

---

## 4. Checklist de Segurança

- [x] SQL parametrizado em todas as queries
- [x] Sanitização de busca (sanitizeSearchTerm)
- [x] Escape HTML em saídas dinâmicas (escapeHtml)
- [x] Validação de UUID em rotas com :id
- [x] safeInteger para valores numéricos de query
- [x] requireAuth em rotas sensíveis
- [x] Filtro por company_id (multi-tenant)
- [x] BCrypt 12 rounds para senhas
- [x] AES-256-GCM para tokens Z-API (quando ENCRYPTION_KEY definida)
- [x] .gitignore para .env
- [x] Rate limiting (auth, API global)
- [x] Helmet para headers de segurança
- [ ] Executar `npm audit` regularmente
- [ ] Manter dependências atualizadas

---

## 5. Arquivos Modificados/Criados

| Arquivo | Alteração |
|---------|-----------|
| `backend/src/utils/security.js` | escapeHtml, safeInteger |
| `backend/src/utils/crypto.js` | Novo – AES-256-GCM |
| `backend/src/routes/admin/logs.js` | safeInteger para days, SQL parametrizado |
| `backend/src/routes/diag_report.js` | requireAuth, escapeHtml, isValidUUID |
| `backend/src/services/zapi.js` | Criptografia opcional de tokens |
| `backend/src/routes/admin/settings.js` | Criptografia ao salvar Z-API |
| `backend/src/app.js` | Rota diag_report com requireAuth |
