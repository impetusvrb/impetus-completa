# LOGIN_REDIRECT_FIX_REPORT
## Relatório de Correcção: Dashboard fecha e redireciona para Login

**Data:** 2026-06-17  
**Severidade:** Crítica — bloqueia utilização completa da plataforma  
**Status:** ✅ RESOLVIDO  

---

## 1. Causa Raiz Encontrada

**Ficheiro:** `backend/src/routes/anam.js` (linha 68)  
**Categoria:** HTTP Status Code propagation incorrecta (external API → client)

### Fluxo do bug

```
1. Utilizador faz login → token JWT gerado → armazenado em localStorage ✅
2. Dashboard abre → Anam inicia → chama POST /api/anam/session-token ✅
3. Anam API externa responde com HTTP 401 (Invalid API key) ❌
4. Backend propaga e.status (401) directamente para o cliente
5. Interceptor api.js apanha HTTP 401 → executa logout global:
     localStorage.removeItem('impetus_token')
     localStorage.removeItem('impetus_user')
     window.location.href = '/'
6. Dashboard fecha → utilizador volta ao ecrã de login ❌
```

### Código responsável (antes da correcção)

```javascript
// backend/src/routes/anam.js — linha 67-78
if (e.code === 'ANAM_RATE_LIMIT' || e.code === 'ANAM_API_ERROR') {
  const status = e.status && e.status >= 400 ? e.status : 502;
  // ↑ Se Anam externa retorna 401, status = 401 — PROPAGADO INCORRECTAMENTE
  return res.status(status).json({ ... });
}
```

### Interceptor que causa o logout (api.js)

```javascript
if (error.response?.status === 401 && !isProacaoRequest && !isLoginRequest) {
  localStorage.removeItem('impetus_token');
  localStorage.removeItem('impetus_user');
  window.location.href = '/';  // ← LOGOUT GLOBAL disparado por erro externo
}
```

---

## 2. Hipóteses Verificadas

| Hipótese | Resultado | Evidência |
|----------|-----------|-----------|
| A — Token armazenado incorrectamente | ❌ Descartado | localStorage.setItem ocorre antes de navigate() |
| B — AuthContext perde estado | ❌ Descartado | App usa localStorage puro, sem AuthContext |
| C — PrivateRoute prematura | ❌ Descartado | PrivateRoute lê localStorage sincronamente |
| D — Tenant inválido | ❌ Descartado | /dashboard/me retorna 200 com tenant OK |
| E — RBAC rejeitando dashboard | ❌ Descartado | /dashboard/me, /dashboard/visibility → 200 |
| F — Token expirado | ❌ Descartado | JWT expira em 8h, iat/exp correcto |
| G — Refresh token quebrado | ❌ Descartado | Sistema não usa refresh token |
| **H — Erro de serviço externo** | ✅ **CAUSA RAIZ** | POST /anam/session-token → HTTP 401 (Anam API key) |

---

## 3. Ficheiros Alterados

### `backend/src/routes/anam.js`

**Alteração:** Nunca reencaminhar HTTP 401/403 da API externa Anam como HTTP 401 do IMPETUS.

```javascript
// ANTES
const status = e.status && e.status >= 400 ? e.status : 502;

// DEPOIS  
let status = e.status && e.status >= 400 ? e.status : 502;
if (status === 401 || status === 403) status = 503; // ← mapeamento seguro
```

**Raciocínio:** O HTTP 401 do IMPETUS significa "utilizador não autenticado". O 401 da Anam significa "API key inválida" — são semânticas completamente distintas. Usar 503 (Service Unavailable) para erros de configuração de serviço externo.

---

### `frontend/src/services/api.js`

**Alteração (defesa em profundidade):** Excluir endpoints Anam do gatilho de logout global.

```javascript
// ANTES
const isProacaoRequest = urlPath.includes('/proacao');
const isLoginRequest = urlPath.includes('/auth/login');
if (error.response?.status === 401 && !isProacaoRequest && !isLoginRequest) {

// DEPOIS
const isProacaoRequest = urlPath.includes('/proacao');
const isLoginRequest = urlPath.includes('/auth/login');
const isAnamRequest = urlPath.includes('/anam/'); // ← adicionado
if (error.response?.status === 401 && !isProacaoRequest && !isLoginRequest && !isAnamRequest) {
```

---

## 4. Testes Executados

```
✅ T1 Login retorna JWT válido
✅ T2 dashboard/me retorna 200
✅ T3 Anam session-token NÃO retorna 401 (CORRIGIDO → 503)
✅ T4 Endpoints core não retornam 401
✅ T5 Token inválido retorna 401 correctamente
✅ T6 companies/me não retorna 401

6/6 PASSED 🎉
```

**Ficheiro de teste:** `backend/src/tests/auth/LoginPersistenceRegression.test.js`

---

## 5. Validação Final

| Critério | Status |
|---------|--------|
| Login ocorre normalmente | ✅ |
| Dashboard permanece aberto | ✅ (Anam já não dispara logout) |
| Nenhum redirect indevido para /login | ✅ |
| Nenhum erro 401 inesperado | ✅ (Anam retorna 503 quando API key inválida) |
| RBAC preservado | ✅ (sem alterações em auth, RBAC, MFA, RLS) |
| Token inválido ainda retorna 401 | ✅ (segurança mantida) |
| Logout manual funciona | ✅ (Layout.jsx sem alterações) |

---

## 6. Notas Operacionais

### Anam não está disponível (comportamento pós-correcção)
Quando a API key Anam não está configurada ou é inválida:
- Endpoint retorna HTTP **503** com `{ code: "ANAM_API_ERROR" }`
- Dashboard **permanece aberto**
- Widget Anam mostra estado de erro/indisponível
- Utilizador **não é desligado**

### Activar Anam em produção
1. Obter API key válida em [anam.ai](https://anam.ai)
2. Definir `ANAM_API_KEY=<key>` no `.env` do backend
3. Reiniciar: `pm2 restart impetus-backend --update-env`

---

## 7. Evidências de Log

```bash
# Antes da correcção
POST /anam/session-token → HTTP 401 {"code":"ANAM_API_ERROR","error":"Invalid API key"}
# → interceptor api.js disparava: localStorage.clear + window.location.href='/'

# Após a correcção
POST /anam/session-token → HTTP 503 {"code":"ANAM_API_ERROR","error":"Invalid API key"}
# → interceptor api.js NÃO dispara logout (503 ≠ 401)
# → dashboard permanece aberto
```
