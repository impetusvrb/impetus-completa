# Evolução para KMS real (AWS / GCP)

Este documento descreve a **estrutura implementada** para integração com AWS KMS e Google Cloud KMS, sem alterar o formato do envelope AES-256-GCM já persistido.

**Importante:** a ativação em produção (credenciais, DEK embrulhada, `warmKmsEncryptionKey` no arranque) é **decisão operacional** — o código suporta o fluxo, mas **não** liga automaticamente KMS no `server.js`.

## Estado atual (compatível)

| Variável | Função |
|----------|--------|
| `DATA_ENCRYPTION_KEY` | Base64 de 32 bytes; material AES no modo `env` e **fallback** se a KMS falhar. |
| `DATA_ENCRYPTION_KMS_PROVIDER` | `aws` ou `gcp` (ou legados `AWS_KMS`, `GCP_KMS`). Com valor reconhecido, os metadados podem usar `key_source: kms` no modo mock. |
| `DATA_ENCRYPTION_KMS_KEY_ID` | **AWS:** KeyId / ARN / alias da CMK. **GCP:** resource name completo do CryptoKey. Necessário para `GenerateDataKey` (bootstrap AWS) e para **decrypt** no GCP. |
| `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` | Base64 do ciphertext da data key; com isto + provider, o backend chama a API **Decrypt** correspondente. |

### Mock (sem API)

Provider definido **sem** `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` e **sem** `DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE` → o material AES continua a ser só `DATA_ENCRYPTION_KEY` (comportamento legado).

### Modo real (API)

1. Operador gera uma data key na KMS (ex.: `GenerateDataKey` na AWS), guarda o **CiphertextBlob** em segredo (ex.: Secret Manager) e injeta em `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` como base64.
2. Runtime chama `Decrypt` e obtém 32 bytes de plaintext → material para `aes-256-gcm`.
3. Opcionalmente, no arranque: `await encryptionService.warmKmsEncryptionKey()` para popular a cache antes de aceitar pedidos que cifram.

Dependências npm (já no projeto quando se usa modo real):

- `@aws-sdk/client-kms` — `DecryptCommand`, `GenerateDataKeyCommand`.
- `@google-cloud/kms` — `KeyManagementServiceClient.decrypt` / `encrypt`.

## Contratos a preservar

1. **Envelope JSONB** (`encrypted`, `iv`, `content`, `auth_tag`, `algorithm`) — não mudar sem migração de dados.
2. **`encryptField` / `decryptField` síncronos** — chamadores existentes não são obrigados a `await`; o carregamento KMS opcional é via `warmKmsEncryptionKey()` ou uso explícito de `fetchKeyFromKMS()`.
3. **Chave AES de 32 bytes** em memória para `createCipheriv` / `createDecipheriv`.

## AWS KMS (SDK v3)

- Cliente: `KMSClient` com região de `AWS_REGION`, `AWS_DEFAULT_REGION` ou `DATA_ENCRYPTION_KMS_REGION`.
- **Decrypt:** `CiphertextBlob` = buffer decodificado de `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK`.
- **GenerateDataKey (bootstrap):** só com `DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE=true` e `DATA_ENCRYPTION_KMS_KEY_ID`; **não** substitui um processo de armazenamento seguro do CiphertextBlob em produção.

## GCP Cloud KMS

- `DATA_ENCRYPTION_KMS_KEY_ID` = nome do recurso `CryptoKey`.
- **Decrypt:** `ciphertext` = buffer base64 de `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK`.
- **Bootstrap:** com flag de bootstrap, gera plaintext aleatório, `encrypt` + `decrypt` na mesma chave — apenas para prova de conceito; em produção use um fluxo de envelope documentado pela Google.

## Fallback para ENV

Se qualquer chamada KMS falhar e `DATA_ENCRYPTION_KEY` for válida, `fetchKeyFromKMS()` devolve material a partir do env com `key_source: 'env'` e `kms_fallback_from_env: true`. Isto deve ser **raro** e monitorizado; não substitui política IAM correta.

## Testes

- `npm run test:encryption-at-rest` — inclui modo mock com `AWS_KMS` e `fetchKeyFromKMS`.
- Staging com KMS real: validar decrypt de dados já cifrados antes de cutover.

## Segurança operacional

- Nunca registar plaintext keys nem ciphertext completo em logs de aplicação.
- Preferir identidade de workload (IRSA, GKE workload identity) em vez de credenciais de longa duração em disco.
- **Não** ativar `DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE` em produção sem processo explícito; o valor esperado em produção é `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` estável.
- Definir rotação de CMK e, se necessário, job de recriptografia (Fase 2 no `DATA_ENCRYPTION.md`).
