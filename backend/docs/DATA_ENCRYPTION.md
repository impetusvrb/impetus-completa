# Criptografia de dados em repouso (traces IA)

## Configuração

1. Gere uma chave de 32 bytes e codifique em Base64:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. Defina no ambiente (nunca commite):

   ```env
   DATA_ENCRYPTION_KEY=<base64_32_bytes>
   ```

3. Opcional:

   - `DATA_ENCRYPTION_MAX_PLAINTEXT_BYTES` — limite de plaintext por campo (padrão 512 KiB).
   - `DATA_ENCRYPTION_KMS_PROVIDER` — `aws` ou `gcp` (também aceites: `AWS_KMS`, `GCP_KMS`, etc.). Com provider definido, os metadados podem indicar `key_source: kms`.
   - `DATA_ENCRYPTION_KMS_KEY_ID` — identificador da chave na nuvem (obrigatório para fluxos que usam a API real; ver secção KMS abaixo).

Se a chave estiver ausente ou inválida, o sistema **não criptografa** e mantém o comportamento anterior (compatível).

## Modo KMS (opcional, não ligado por defeito em produção)

Objetivo: o material AES-256 usado por `encryptField` / `decryptField` pode ser obtido por **unwrap** na KMS, com **fallback** para `DATA_ENCRYPTION_KEY` se a chamada falhar.

| Variável | Uso |
|----------|-----|
| `DATA_ENCRYPTION_KMS_PROVIDER` | `aws` ou `gcp` (valores legados normalizados internamente). |
| `DATA_ENCRYPTION_KMS_KEY_ID` | **AWS:** KeyId ou ARN/alias da CMK para `GenerateDataKey`. **GCP:** nome completo do CryptoKey (`projects/.../locations/.../keyRings/.../cryptoKeys/...`). |
| `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` | Base64 do **ciphertext** da data key (CiphertextBlob AWS / ciphertext GCP). Com isto definido, o backend chama **Decrypt** na KMS e usa o plaintext (32 bytes) como material AES. |
| `DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE` | `true` ou `1` — **apenas laboratório**: AWS usa `GenerateDataKey`; GCP faz roundtrip encrypt+decrypt. **Não usar em produção** sem processo explícito; em produção guarde o ciphertext da DEK em `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK`. |
| `DATA_ENCRYPTION_KMS_REGION` | Opcional (AWS): região do cliente KMS se não usar `AWS_REGION` / `AWS_DEFAULT_REGION`. |

Comportamento:

- **Mock (compatível com versões anteriores):** provider definido **sem** `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` e **sem** bootstrap → o material continua a ser só `DATA_ENCRYPTION_KEY`; `fetchKeyFromKMS()` equivale a `getEncryptionKey()`.
- **API real:** `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` (+ credenciais IAM / ADC conforme o cloud) → `Decrypt` na KMS.
- **Fallback:** falha de rede, permissão ou formato → se `DATA_ENCRYPTION_KEY` for válida, `fetchKeyFromKMS()` devolve bundle com `key_source: env` e `kms_fallback_from_env: true` (útil para recuperação controlada; monitorizar em auditoria).

### Arranque com material KMS real

`encryptField` / `decryptField` continuam síncronos e usam cache em memória. Para **preencher** essa cache a partir de KMS **antes** de tráfego que cifra:

```js
const encryptionService = require('./services/encryptionService');
await encryptionService.warmKmsEncryptionKey();
```

Isto **não** é invocado automaticamente em `server.js` — deve ser uma decisão explícita de operações após validação em staging.

API interna:

- `getEncryptionKey()` — `{ key, key_source: 'env'|'kms', key_version }` (não logar `key`).
- `getEncryptionKeyMeta()` — apenas `{ key_source, key_version }` para `model_info` / telemetria segura.
- `fetchKeyFromKMS()` — async; mock ou chamada KMS + fallback env.
- `warmKmsEncryptionKey()` — async; aplica o resultado de `fetchKeyFromKMS()` à cache interna.

Ver [KMS_EVOLUTION.md](./KMS_EVOLUTION.md) para detalhes de AWS/GCP e segurança operacional.

## Quando criptografa

Em `ai_interaction_traces`, os campos `input_payload`, `output_response` e (se aplicável) `validation_evidence` são cifrados quando:

- `data_classification` indica `PERSONAL` ou `SENSITIVE` (categoria ou flags de dados sensíveis/pessoais), ou
- `risk_level` é `HIGH` ou `CRITICAL`, ou
- `trace_policy_rules.force_encryption` é verdadeiro (derivado de `policy.rules.force_encryption` no conselho cognitivo).

O `model_info` recebe, quando a cifra é aplicada: `encryption_applied: true`, `encryption_version: v1`, `encryption_key_source` (`env` ou `kms`) e `encryption_key_version` (ex.: `v1`).

## Formato no PostgreSQL

Envelope JSONB (AES-256-GCM):

```json
{
  "encrypted": true,
  "iv": "<base64>",
  "content": "<base64>",
  "auth_tag": "<base64>",
  "algorithm": "aes-256-gcm"
}
```

## Leitura

A descriptografia ocorre apenas no backend (`hydrateTracePayloadsForRead` em leituras de traces). Não exponha a chave ao frontend.

## Admin

- `GET /api/admin-portal/security/encryption-status` (super_admin): estado da chave e cobertura estimada (últimos 365 dias). O campo `meta` inclui indicadores como `kms_provider_normalized`, `kms_key_id_configured`, `kms_wrapped_dek_configured`, `kms_real_api_eligible`.

## Fase 2 (opcional)

Script de recriptografia de linhas antigas: percorrer traces em plaintext que atendam aos critérios atuais, cifrar e atualizar — deve ser executado em janela de manutenção, com backup e validação de integridade.
