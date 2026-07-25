# Especificação do Baseline Manager — IMPETUS

**Documento:** INTEGRITY_BASELINE_MANAGER_SPEC.md  
**Missão:** INT-01A (FASE 3)  
**Data:** 2026-07-23  
**Status:** MANAGER_DEFINED

---

## 1. Visão geral

O **Baseline Manager** é o sub-componente do Sensor de Integridade responsável por toda a gestão do ciclo de vida do baseline criptográfico. Opera como uma camada de abstracção entre o `HashChecker`/`PermChecker` e o armazenamento físico do baseline.

---

## 2. Responsabilidades formais

| Responsabilidade | Descrição |
|---|---|
| **Armazenar baseline** | Persistir `baseline.json` de forma atómica em `/var/lib/impetus/integrity/` |
| **Versionar baseline** | Manter histórico em `baseline_history/` com naming `baseline.YYYYMMDDHHMMSS.json` |
| **Registar mudanças autorizadas** | Escrever entrada em `events.jsonl` para cada operação de baseline |
| **Impedir substituições acidentais** | Verificar flag de autorização antes de qualquer escrita |
| **Permitir rotação controlada** | Expor método `rotateTo(newBaseline, reason, approvedBy)` com validação |
| **Detectar corrupção** | Verificar estrutura JSON e presença de campos obrigatórios ao carregar |
| **Reportar staleness** | Calcular idade do baseline e expor métrica `baseline_age_days` |

---

## 3. Interface pública (API do módulo)

```javascript
// ESPECIFICAÇÃO — não implementar até INT-01B

class BaselineManager {

  /**
   * Carrega o baseline do disco. Lança erro se corrompido.
   * @returns {BaselineData}
   */
  load()

  /**
   * Verifica se o baseline existe e é válido.
   * @returns {boolean}
   */
  isValid()

  /**
   * Retorna o hash SHA256 de um activo específico pelo ID.
   * @param {string} assetId  — e.g. "INT-C-001"
   * @returns {string|null}   — hash ou null se não encontrado
   */
  getHash(assetId)

  /**
   * Retorna a entrada completa de um activo.
   * @param {string} assetId
   * @returns {AssetBaselineEntry|null}
   */
  getAsset(assetId)

  /**
   * Cria um novo baseline completo.
   * REQUER: INTEGRITY_INIT_BASELINE=true OU flag explícito.
   * Persiste de forma atómica. Versiona o anterior.
   * @param {BaselineData} newBaseline
   * @param {string} reason
   * @param {string} approvedBy
   */
  init(newBaseline, reason, approvedBy)

  /**
   * Actualiza apenas os hashes de activos específicos.
   * REQUER: flag de autorização explícito.
   * @param {string[]} assetIds  — lista de IDs a actualizar
   * @param {string} reason
   * @param {string} approvedBy
   */
  updatePartial(assetIds, reason, approvedBy)

  /**
   * Arquiva o baseline actual e substitui pelo novo.
   * @param {BaselineData} newBaseline
   * @param {string} reason
   * @param {string} approvedBy
   */
  rotateTo(newBaseline, reason, approvedBy)

  /**
   * Retorna a idade do baseline em dias.
   * @returns {number}
   */
  getAgeDays()

  /**
   * Retorna métricas de saúde do baseline.
   * @returns {BaselineHealthMetrics}
   */
  getHealth()

  /**
   * Lista todos os activos sem entrada no baseline.
   * @param {string[]} expectedAssetIds
   * @returns {string[]}
   */
  getMissingAssets(expectedAssetIds)

}
```

---

## 4. Estrutura de dados

### 4.1 BaselineData

```javascript
{
  schema_version: "1.0",       // string
  baseline_id: string,          // "INT-01A-BASELINE-YYYYMMDD"
  created_at: string,           // ISO 8601
  mission: string,              // "INT-01A"
  description: string,
  hash_algorithm: "SHA256",
  total_assets: number,
  assets: {
    CRITICAL: { [assetId]: AssetBaselineEntry },
    HIGH:     { [assetId]: AssetBaselineEntry },
    MEDIUM:   { [assetId]: AssetBaselineEntry }
  }
}
```

### 4.2 AssetBaselineEntry

```javascript
{
  path: string,                  // caminho absoluto
  sha256: string,                // hash hexadecimal
  size_bytes: number,
  mtime_unix: number,            // unix timestamp
  mtime_iso: string,             // ISO 8601
  perm: string,                  // "644", "600", etc.
  owner: string,
  group: string,
  inode: number|null,
  is_symlink: boolean,           // opcional
  canonical_path: string|null,   // path real se symlink
  note: string|null              // observação opcional
}
```

### 4.3 BaselineHealthMetrics

```javascript
{
  baseline_exists: boolean,
  baseline_valid: boolean,
  baseline_id: string,
  created_at: string,
  age_days: number,
  assets_total: number,
  assets_critical: number,
  assets_high: number,
  assets_medium: number,
  staleness_warning: boolean,    // true se age_days > 90
  missing_assets: string[]       // IDs sem baseline
}
```

---

## 5. Regras de escrita atómica

Para garantir que o baseline nunca fica num estado parcial:

```
1. Serializar BaselineData → JSON string
2. Escrever em arquivo temporário: baseline.json.tmp
3. Verificar que tmp é JSON válido e contém campos obrigatórios
4. Atomic rename: baseline.json.tmp → baseline.json
5. Registar em events.jsonl: { event_type: "INTEGRITY_BASELINE_WRITTEN", ... }
```

Em caso de erro na escrita → ficheiro `.tmp` apagado; baseline anterior preservado.

---

## 6. Regras de autorização

O Baseline Manager verifica autorização antes de qualquer escrita:

```javascript
function isWriteAuthorized() {
  return (
    process.env.INTEGRITY_INIT_BASELINE === 'true' ||
    process.env.INTEGRITY_ALLOW_PARTIAL_UPDATE === 'true'
  );
}
```

Se não autorizado → lança `IntegrityBaselineAuthorizationError` com mensagem clara.

---

## 7. Versionamento do histórico

Ao substituir o baseline:

```
/var/lib/impetus/integrity/
├── baseline.json                          (activo)
├── baseline_history/
│   ├── baseline.20260723121645.json        (arquivado)
│   └── baseline.20260901000000.json        (exemplo futuro)
└── events.jsonl
```

Retenção do histórico: 90 dias; limpeza por cron em INT-01C.

---

## 8. Detecção de corrupção

Ao carregar o baseline, verificar:

| Verificação | Acção se falhar |
|---|---|
| JSON.parse sem erro | Lançar `INTEGRITY_BASELINE_CORRUPT` |
| `schema_version` presente | Lançar `INTEGRITY_BASELINE_CORRUPT` |
| `assets.CRITICAL` é objecto | Lançar `INTEGRITY_BASELINE_CORRUPT` |
| Pelo menos 1 activo CRITICAL | Warning: `INTEGRITY_BASELINE_EMPTY` |
| `created_at` parseable como data | Warning |

Em caso de corrupção:
1. Estado do sensor → `DEGRADED`
2. Evento `INTEGRITY_BASELINE_CORRUPT` gerado
3. Painel exibe `SEM_TELEMETRIA` com evidência clara
4. Baseline histórico mais recente carregado como fallback (se disponível)

---

## 9. Localização dos ficheiros

| Ficheiro | Path |
|---|---|
| Baseline activo | `/var/lib/impetus/integrity/baseline.json` |
| Permissões baseline | `/var/lib/impetus/integrity/perm_baseline.json` |
| Histórico | `/var/lib/impetus/integrity/baseline_history/` |
| Estado do sensor | `/var/lib/impetus/integrity/state.json` |
| Log de eventos | `/var/lib/impetus/integrity/events.jsonl` |
| Inventário de activos | `backend/security/integrity/asset_inventory.json` |
| Baseline inicial (este) | `backend/security/integrity/baseline.json` |

**Nota:** O baseline em `backend/security/integrity/baseline.json` é o baseline de referência criado em INT-01A (sob controlo de versão). O baseline operacional em `/var/lib/impetus/integrity/baseline.json` será criado em INT-01C quando o sensor for activado.

---

## 10. Preparação para INT-01B

O Baseline Manager está especificado para implementação em INT-01B como parte de `IntegrityStateStore.js`. O ficheiro `baseline.json` criado nesta fase (INT-01A) será copiado para `/var/lib/impetus/integrity/baseline.json` durante o arranque do sensor (INT-01C).

Ficheiros disponíveis para INT-01B:
- `backend/security/integrity/baseline.json` — 33 activos com hashes reais
- `backend/security/integrity/asset_inventory.json` — inventário completo com metadados
- `backend/docs/evidence/int-01a/INTEGRITY_BASELINE_POLICY.md` — regras de aprovação
- Este documento — interface e estrutura de dados
