# Manual — Renovação de Licença Enterprise

**Certificação:** CERT-LICENSE-01

---

## 1. Quando renovar

| Situação | Prazo recomendado |
|----------|-------------------|
| Estado `expiring_soon` (≤ 30 dias) | Renovar antes de `expires_at` |
| Estado `grace` | **Imediato** — tolerância limitada |
| Estado `expired` | Sistema bloqueado — renovação urgente |

Consultar:

```bash
npm run enterprise:license -- status
```

Campos relevantes: `expires_at`, `days_until_expiry`, `grace_ends_at`, `state`.

---

## 2. Procedimento padrão (offline)

### Passo 1 — Obter Installation ID

```bash
cat ${IMPETUS_HOME}/licenses/installation.id
# ou
npm run enterprise:license -- info
```

### Passo 2 — Solicitar licença à IMPETUS

Fornecer:

- Installation ID
- Company UUID (`company_id` na licença actual ou BD)
- Plano desejado e capabilities
- Data de validade desejada

### Passo 3 — Backup da licença actual

```bash
cp ${IMPETUS_HOME}/licenses/impetus.license.json \
   ${IMPETUS_HOME}/backups/licenses/impetus.license.$(date +%Y%m%d).json
```

(Incluído automaticamente no backup enterprise — ver `MANUAL-BACKUP.md`.)

### Passo 4 — Importar nova licença

```bash
npm run enterprise:license -- import --file=/tmp/impetus.license.json
npm run enterprise:license -- validate
```

Validar:

- `state`: `valid` ou `expiring_soon`
- `operational`: `true`
- `installation_id` coincide
- `capabilities` esperadas presentes

### Passo 5 — Invalidar cache e reiniciar

```bash
# Opcional via API
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://impetus.local/api/system/license/refresh

pm2 restart impetus-backend --update-env
```

### Passo 6 — Confirmar

```bash
npm run enterprise:license -- status
npm run enterprise:health   # se disponível
```

---

## 3. Renovação sem downtime (recomendado)

1. Importar nova licença **antes** de `expires_at` (substitui ficheiro).
2. Middleware cache TTL default 5 min — ou `POST /refresh`.
3. Utilizadores activos: próximo request usa licença nova; sem reinício obrigatório.

---

## 4. Renovação com alteração de capabilities

Nova licença pode adicionar ou remover capabilities. Verificar matriz em `status`:

```json
"capabilities": [
  { "key": "digital_twin", "enabled": true, ... }
]
```

Módulos desactivados deixam de estar licenciados; RBAC não muda automaticamente.

---

## 5. Renovação SaaS (modo remoto)

Instalações cloud com `LICENSE_MODE=remote`:

1. Actualizar `LICENSE_KEY` no `.env` se a chave mudou.
2. `LICENSE_VALIDATION_ENABLED=true`
3. Reiniciar backend.
4. Validação via `LICENSE_SERVER_URL`.

Fail-open opcional: `LICENSE_REMOTE_FAIL_OPEN=true` (não recomendado produção).

---

## 6. Checklist pós-renovação

- [ ] `validate` exit code 0
- [ ] `state` ≠ `expired` / `invalid`
- [ ] Logs sem `LICENSE_VALIDATION_FAILED`
- [ ] UI não redirecciona para `/license-expired`
- [ ] Backup da licença anterior arquivado

---

## Referências

- `MANUAL-LICENSING.md`
- `MANUAL-LICENSE-RECOVERY.md`
- `MANUAL-BACKUP.md`
