# Plano de Correção - Varredura do Software

**Data:** 2025-02-20  
**Foco:** Mecanismo de criação de usuários e pontos críticos que podem travar o software

---

## Problemas Encontrados

### 1. Backend – Criação de usuário sem `company_id`
**Arquivo:** `backend/src/routes/admin/users.js` (POST /)  
**Risco:** Se o administrador logado não tiver `company_id` (ex.: perfil especial), o INSERT pode falhar ou criar usuário órfão.  
**Correção:** Validar `req.user.company_id` antes do INSERT e retornar erro 400 se for null.

### 2. Backend – Validação de UUID no PUT (atualizar usuário)
**Arquivo:** `backend/src/routes/admin/users.js` (PUT /:id)  
**Risco:** O GET e DELETE validam o ID com `isValidUUID`, mas o PUT não. ID inválido pode gerar erro de banco.  
**Correção:** Adicionar `isValidUUID(req.params.id)` no início do handler.

### 3. Backend – `parseInt` no filtro `hierarchy_level` (lista)
**Arquivo:** `backend/src/routes/admin/users.js` (GET /)  
**Risco:** Se `hierarchy_level` vier como string inválida (ex.: "abc"), `parseInt` retorna NaN e pode causar erro na query.  
**Correção:** Usar `safeInteger` ou validar o resultado antes de enviar à query.

### 4. Backend – Paginação sem validação (limit/offset)
**Arquivo:** `backend/src/routes/admin/users.js` (GET /)  
**Risco:** `limit` e `offset` vindos da query podem ser NaN ou negativos.  
**Correção:** Aplicar `safeInteger` em limit e offset.

### 5. Frontend – `parseInt` retornando NaN no `hierarchy_level`
**Arquivo:** `frontend/src/pages/AdminUsers.jsx` (handleFormChange)  
**Risco:** Se o usuário manipular o valor ou houver bug, `parseInt("", 10)` retorna NaN e o estado fica inválido.  
**Correção:** Usar fallback quando o resultado for NaN (ex.: manter 5).

### 6. Frontend – Select com valor inconsistente
**Arquivo:** `frontend/src/pages/AdminUsers.jsx` (UserForm)  
**Risco:** `value={formData.hierarchy_level}` pode ser NaN, gerando aviso de controlled/uncontrolled component.  
**Correção:** Garantir valor sempre numérico válido, ex.: `value={Number.isInteger(formData.hierarchy_level) ? formData.hierarchy_level : 5}`.

### 7. Backend – Proteção ao acessar `countResult.rows[0]`
**Arquivo:** `backend/src/routes/admin/users.js` (GET /)  
**Risco:** Baixo, mas `countResult.rows[0]` pode não existir em cenários extremos.  
**Correção:** Usar `countResult.rows[0]?.total ?? 0` para evitar crash.

---

## Status

| # | Item                    | Status     |
|---|-------------------------|------------|
| 1 | company_id null check    | Implementado |
| 2 | isValidUUID no PUT       | Implementado |
| 3 | safeInteger hierarchy    | Implementado |
| 4 | safeInteger limit/offset | Implementado |
| 5 | NaN no handleFormChange  | Implementado |
| 6 | Select value consistente | Implementado |
| 7 | countResult fallback     | Implementado |

### Correções adicionais
- Guarda `selectedUser?.id` em handleUpdate, handleDelete e handleResetPassword para evitar chamadas com usuário inválido.
