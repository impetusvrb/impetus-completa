# IMPETUS-BACKEND-STABILITY-P0-002 — Pre-flight arquivo externo

**Timestamp UTC:** 2026-07-14T13:26:00Z  
**Classificação:** `EXTERNAL_ARCHIVE_DESTINATION_NOT_READY`

---

## Destino externo

| Verificação | Resultado |
|---|---|
| Mount externo ao `/` | **NÃO DETECTADO** |
| Dispositivos | Apenas `/dev/sda1` (97G, 97% usado) |
| Volume USB/NFS/S3 mount | **Ausente** |
| Espaço livre em `/` | **3.9 GB** — insuficiente para cópia interna dos artefactos grandes |

**Conclusão:** A transferência externa conforme manifest requer **destino fora deste VPS** (workstation autorizada + disco externo ~1 TB), via `scp`/`rsync` **a partir de** cliente externo **ou** montagem explícita de volume externo neste host.

**Nenhuma cópia de ficheiros grandes foi iniciada neste servidor** — copiar 30 GB para outro path no mesmo `/` não aliviaria o filesystem e arriscaria ENOSPC.

---

## Inventário de origens (T0)

| Artefacto | Path | Tamanho observado | SHA-256 |
|---|---|---|---|
| checkpoint SQL | `backend/backups/checkpoint_2026-06-26T1622.sql` | ~19 GB | Pendente (calcular no momento da transferência) |
| database dump | `backend/backups/backup_20260701_000949/database.dump` | ~2.3 GB | Pendente |
| apport coredump | `/var/lib/apport/coredump/` | ~8.7 GB | Ver `APPORT_CORE_SHA256_MANIFEST.txt` |
| staging evidence | `export-staging/*.tar.gz` | ~61 MB total | Ver `T0-staging-sha256.txt` |

**Espaço potencialmente recuperável após exclusão autorizada:** ~30 GB (não imediato para PG outbox)

---

## Staging packages — hashes T0

Ver ficheiro: `T0-staging-sha256.txt`  
Comparar com `EXTERNAL_ARCHIVE_TRANSFER_MANIFEST.json` antes de transferir.

---

## Instruções para operador humano (quando destino estiver pronto)

1. Montar disco externo na workstation (não no VPS até haver mount dedicado com espaço).
2. `scp`/`rsync` dos paths listados no manifest.
3. `sha256sum` origem (VPS) e destino (externo) — comparar.
4. Testar legibilidade: `pg_restore --list` no dump; `head` no SQL; listar coredumps.
5. Actualizar manifest: `external_archive_validated=true`.
6. **Só então** solicitar exclusão explícita dos originais no VPS.

---

## Gate de exclusão

**NENHUM original apagado nesta missão.**  
Autorização humana explícita requerida após `COPY_VERIFIED + HASH_MATCH + READABILITY_OK`.
