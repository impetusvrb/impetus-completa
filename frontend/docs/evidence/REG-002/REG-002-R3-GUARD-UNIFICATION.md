# REG-002 R3 — Guard Unification

**Fase:** REG-002 · **Prioridade:** P1

---

## Antes → Depois

| Item | Antes | Depois |
|------|-------|--------|
| Layout menu | `operational` + (ceo \|\| **qualquer** diretor) | `operational` + política partilhada |
| App route | CEO; diretor só industrial/operations | **mesma** política |
| Divergência | Menu mostra → route redireciona `/app` | Eliminada |

---

## Política única

`frontend/src/utils/industrialCoreAccess.js`:

- CEO → true
- Diretor → `director_industrial` \| `director_operations` \| área industrial/operations/operacoes
- Menu → requer ainda `visible_modules` ⊇ `operational`

**Não amplia** permissões de rota (critério = App histórico).  
**Não reduz** acesso de quem já passava no App.  
Elimina apenas falsos positivos de menu.

## Ficheiros

- `frontend/src/utils/industrialCoreAccess.js` (**novo**)
- `frontend/src/App.jsx` (import partilhado)
- `frontend/src/components/Layout.jsx` (import partilhado)

## Validação

```bash
npm run test:reg002-guards
```
