# Manual — Recuperação de Licença Enterprise

**Certificação:** CERT-LICENSE-01

---

## 1. Cenários

| Problema | Estado típico | Secção |
|----------|---------------|--------|
| Licença expirada (pós-grace) | `expired` | §2 |
| Assinatura inválida / ficheiro adulterado | `invalid` | §3 |
| Installation ID incorrecto | `installation_id_mismatch` | §4 |
| Ficheiro ausente | `missing` | §5 |
| Chave pública em falta | `no_public_key` | §6 |
| Sistema bloqueado (403 LICENSE_INVALID) | `expired` / `invalid` | §7 |
| Perda total de `licenses/` | — | §8 |

---

## 2. Licença expirada (pós-grace)

**Sintoma:** API retorna 403 `LICENSE_INVALID`; redirect para `/license-expired`.

**Recuperação:**

1. Obter licença renovada da IMPETUS (mesmo `installation_id`).
2. Importar:
   ```bash
   npm run enterprise:license -- import --file=/path/nova.license.json
   ```
3. Confirmar `state: valid`.
4. Reiniciar PM2 ou aguardar cache middleware (5 min).

**Mitigação temporária (emergência — não produção prolongada):**

```env
LICENSE_VALIDATION_ENABLED=false
```

Reactivar após importação válida.

---

## 3. Assinatura inválida

**Sintoma:** `reason: invalid_signature` ou `missing_signature`.

**Causas:** ficheiro editado manualmente, licença de outro fornecedor, corrupção.

**Recuperação:**

1. Restaurar backup:
   ```bash
   cp ${IMPETUS_HOME}/backups/.../impetus.license.json \
      ${IMPETUS_HOME}/licenses/impetus.license.json
   ```
2. Ou re-importar licença original da IMPETUS.
3. Verificar `public.pem` corresponde ao emissor.

---

## 4. Installation ID incorrecto

**Sintoma:** `reason: installation_id_mismatch`.

**Causa:** licença emitida para outra instalação.

**Recuperação:**

1. **Não** alterar `installation.id` manualmente para forçar match (quebra rastreabilidade).
2. Ler ID correcto:
   ```bash
   cat ${IMPETUS_HOME}/licenses/installation.id
   ```
3. Solicitar re-emissão IMPETUS com esse ID.

Se `installation.id` foi **perdido** antes de qualquer licença: novo ficheiro será gerado — licenças antigas invalidam-se; re-emissão obrigatória.

---

## 5. Ficheiro ausente

**Sintoma:** `license_file_not_found`, `state: missing`.

```bash
npm run enterprise:license -- import --file=/path/impetus.license.json
```

Se `LICENSE_BLOCK_WHEN_MISSING=true`: sistema bloqueia até importação.

---

## 6. Chave pública em falta

**Sintoma:** `no_public_key` na validação.

**Recuperação:**

1. Copiar `public.pem` fornecido pela IMPETUS:
   ```bash
   cp public.pem ${IMPETUS_HOME}/licenses/public.pem
   chmod 640 ${IMPETUS_HOME}/licenses/public.pem
   ```
2. Ou configurar `LICENSE_PUBLIC_KEY_PATH` / `LICENSE_PUBLIC_KEY` no `.env`.
3. Re-validar:
   ```bash
   npm run enterprise:license -- validate
   ```

---

## 7. Desbloqueio de emergência

Ordem recomendada (do menos ao mais invasivo):

1. Importar licença válida (solução correcta).
2. `POST /api/system/license/refresh` (admin).
3. Reduzir cache: `LICENSE_MIDDLEWARE_CACHE_MS=1000` + restart.
4. **Último recurso:** `LICENSE_VALIDATION_ENABLED=false` — documentar incidente.

Rotas whitelist continuam acessíveis com licença inválida: `/api/auth`, `/api/health`, `/api/system/license`.

Admin pode importar via API mesmo com middleware activo (rota whitelisted).

---

## 8. Recuperação completa de `licenses/`

A partir de backup enterprise:

```bash
# Restore parcial (ver MANUAL-RESTORE.md)
tar -xzf backup-YYYYMMDD.tar.gz -C / opt/impetus/licenses/
```

Ou:

```bash
npm run enterprise:restore -- --dry-run
```

Após restore:

```bash
npm run enterprise:license -- validate
npm run enterprise:verify
```

---

## 9. Diagnóstico

```bash
npm run enterprise:license -- status
npm run enterprise:license -- info
npm run enterprise:license -- validate
```

Logs:

```bash
pm2 logs impetus-backend | grep '\[LICENSE\]'
```

Métricas em `status` → `metrics.validations_failed`, `grace_active`.

---

## 10. Contacto IMPETUS

Fornecer sempre:

- Installation ID
- `license_id` (se disponível)
- `state` e `reason` do `validate`
- Versão IMPETUS (`min_version` vs actual)

---

## Referências

- `MANUAL-LICENSING.md`
- `MANUAL-LICENSE-RENEWAL.md`
- `MANUAL-RESTORE.md`
- `MANUAL-BACKUP.md`
