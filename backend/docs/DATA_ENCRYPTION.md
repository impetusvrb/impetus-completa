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
   - `DATA_ENCRYPTION_KMS_PROVIDER` — reservado para integração futura (ex.: `AWS_KMS`).

Se a variável estiver ausente ou inválida, o sistema **não criptografa** e mantém o comportamento anterior (compatível).

## Quando criptografa

Em `ai_interaction_traces`, os campos `input_payload`, `output_response` e (se aplicável) `validation_evidence` são cifrados quando:

- `data_classification` indica `PERSONAL` ou `SENSITIVE` (categoria ou flags de dados sensíveis/pessoais), ou
- `risk_level` é `HIGH` ou `CRITICAL`, ou
- `trace_policy_rules.force_encryption` é verdadeiro (derivado de `policy.rules.force_encryption` no conselho cognitivo).

O `model_info` recebe `encryption_applied: true` e `encryption_version: v1` quando a cifra é aplicada.

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

- `GET /api/admin-portal/security/encryption-status` (super_admin): estado da chave e cobertura estimada (últimos 365 dias).

## Fase 2 (opcional)

Script de recriptografia de linhas antigas: percorrer traces em plaintext que atendam aos critérios atuais, cifrar e atualizar — deve ser executado em janela de manutenção, com backup e validação de integridade.
