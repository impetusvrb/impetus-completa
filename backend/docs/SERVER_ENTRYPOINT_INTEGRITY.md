# SERVER_ENTRYPOINT_INTEGRITY

**FASE:** GIT-AUDIT-01  
**Data:** 2026-06-04  
**Modo:** READ ONLY  
**Entrypoint PM2:** `/var/www/impetus-completa/backend/src/server.js`

---

## Existência física

```text
ls -lah backend/src/server.js
→ cannot access 'backend/src/server.js': No such file or directory
```

**Estado no disco:** **AUSENTE**

---

## Correspondência com HEAD

```text
git diff HEAD -- backend/src/server.js
→ deleted file mode 100644 (working tree vs HEAD)
```

| Local | Estado |
|-------|--------|
| **Git HEAD / origin/main** | Ficheiro **presente** (versão completa do servidor) |
| **Working tree** | Ficheiro **removido** |

Primeiras linhas em `HEAD` (comentário histórico):

```javascript
/**
 * Ponto de entrada alternativo (árvore `backend/` na raiz do repo).
 * O PM2 neste servidor usa: impetus_complete/backend/src/server.js
 */
```

**Nota:** o comentário em HEAD está **desatualizado** — `pm2 describe` confirma uso de `backend/src/server.js` na raiz, não `impetus_complete`.

---

## PM2 vs disco

| Item | Valor |
|------|-------|
| Processo | online (~15h uptime na amostra) |
| script path configurado | `.../backend/src/server.js` |
| Ficheiro no disco | **não existe** |

**Interpretação:** processo provavelmente iniciado **antes** da remoção local do ficheiro, ou Node mantém o processo sem re-leitura do source. **`pm2 reload impetus-backend` ou restart** tenderá a **falhar** até `git checkout HEAD -- backend/src/server.js` (ou equivalente seguro).

---

## Relação com commit `7ea6cb2b8`

O commit **não** removeu `backend/src/server.js` do repositório. A ausência é **working tree local**, não efeito do push.

---

## Classificação

| Nível | Veredicto |
|-------|-----------|
| **CRITICAL** | Entrypoint oficial ausente no disco com PM2 ainda configurado para esse path |
