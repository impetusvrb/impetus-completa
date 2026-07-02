# Manual — Licenciamento Enterprise IMPETUS

**Certificação:** CERT-LICENSE-01 · **ADR:** ADR-009

---

## 1. Visão geral

O IMPETUS Enterprise utiliza licença **local**, **assinada** e **offline**. A autenticidade é verificada por chave pública Ed25519 — sem dependência de base de dados ou Internet.

**Separado de:** billing SaaS (Asaas/Stripe), subscription tokens, cobrança recorrente.

---

## 2. Layout de ficheiros

Com `IMPETUS_HOME=/opt/impetus`:

```
/opt/impetus/licenses/
├── installation.id          # UUID único desta instalação (gerado automaticamente)
├── impetus.license.json     # Licença activa assinada
└── public.pem               # Chave pública IMPETUS (recomendado)
```

---

## 3. Installation ID

Gerado na primeira execução (`license-admin status` ou arranque do backend com `IMPETUS_HOME`).

```bash
cat /opt/impetus/licenses/installation.id
```

**Enviar este ID à IMPETUS** para emissão da licença vinculada à instalação.

---

## 4. Configuração `.env`

```env
IMPETUS_HOME=/opt/impetus

# Activar enforcement (após licença instalada)
LICENSE_VALIDATION_ENABLED=true
LICENSE_MODE=local

# Grace period (dias após expires_at)
LICENSE_GRACE_PERIOD_DAYS=14

# Chave pública (uma das opções)
LICENSE_PUBLIC_KEY_PATH=/opt/impetus/licenses/public.pem
# ou LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Opcional
LICENSE_BLOCK_WHEN_MISSING=false
```

**Modo SaaS remoto (cloud existente):**

```env
LICENSE_VALIDATION_ENABLED=true
LICENSE_MODE=remote
LICENSE_SERVER_URL=https://licenca.impetus.com.br/api/validate
LICENSE_KEY=sua_chave
LICENSE_API_KEY=sua_api_key
```

---

## 5. Importar licença

### CLI (recomendado)

```bash
cd /var/www/impetus-completa/backend
npm run enterprise:license -- import --file=/tmp/impetus.license.json
npm run enterprise:license -- validate
npm run enterprise:license -- status
```

### API (admin autenticado)

```http
POST /api/system/license/import
Authorization: Bearer <jwt-admin>
Content-Type: application/json

{ ... licença JSON completa com signature ... }
```

---

## 6. Verificar estado

```bash
npm run enterprise:license -- status
npm run enterprise:license -- info
```

API:

```http
GET /api/system/license/status
```

Resposta inclui: `state`, `capabilities`, `grace_ends_at`, `metrics`.

---

## 7. Estados da licença

| Estado | Significado | Acção |
|--------|-------------|-------|
| `valid` | OK | Nenhuma |
| `expiring_soon` | ≤ 30 dias | Planear renovação |
| `grace` | Expirada, tolerância activa | Renovar urgentemente |
| `expired` | Bloqueada | Importar licença nova |
| `invalid` | Assinatura/ID errado | Contactar suporte IMPETUS |
| `missing` | Ficheiro ausente | Importar licença |

Durante `grace`: sistema **opera**; logs `[LICENSE] LICENSE_GRACE` são emitidos.

---

## 8. Capabilities

A licença lista módulos habilitados (`capabilities` array). Catálogo completo em `licenseCapabilities.js`.

Exemplo na licença:

```json
"capabilities": ["core", "anam", "digital_twin", "executive", "executive_boardroom", "voice_realtime"]
```

`core` é sempre incluído. RBAC continua a controlar permissões por utilizador.

---

## 9. Emissão (ambiente IMPETUS — não cliente)

Apenas no servidor de emissão interno:

```env
LICENSE_ISSUER_PRIVATE_KEY_PATH=/secure/issuer-private.pem
```

```bash
npm run enterprise:license -- issue \
  --installation-id=<uuid-do-cliente> \
  --company-id=<uuid-empresa> \
  --company-name="Fábrica XYZ" \
  --expires=2027-06-30T23:59:59.000Z \
  --capabilities=core,anam,digital_twin,executive
```

Entregar ao cliente: `impetus.license.json` + `public.pem`.

---

## 10. Reinício após alteração

```bash
pm2 restart impetus-backend --update-env
```

Ou conforme procedimento local da instalação.

---

## Referências

- `backend/docs/CERT-LICENSE-01.md`
- `backend/docs/enterprise/MANUAL-LICENSE-RENEWAL.md`
- `backend/docs/enterprise/MANUAL-LICENSE-RECOVERY.md`
