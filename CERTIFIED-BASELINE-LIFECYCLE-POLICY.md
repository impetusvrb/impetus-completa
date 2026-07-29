# Certified Baseline Lifecycle Policy

**Identificador:** POLICY-BASELINE-LIFECYCLE-001  
**Vigência:** 29/07/2026 — tempo indeterminado  
**Obrigatoriedade:** mandatória para todos os processos de certificação e sincronização de baseline no IMPETUS  
**Aprovação requerida:** Architecture Board  
**Origem:** ENT-GOV-002 — lição aprendida da ruptura de custódia investigada em ENT-GOV-001/001B/001C

---

## 1. Princípio fundamental

> **Nenhum digest poderá ser considerado certificado se o conteúdo correspondente não estiver preservado de forma verificável e recuperável.**

---

## 2. Artefacto

Todo hash certificado deve corresponder a um artefacto:

- commitado no Git;
- cujo blob pode ser extraído e re-hashado deterministicamente;
- sem dependência de working tree, estado de disco ou memória volátil.

---

## 3. Commit

Nenhum digest poderá ser registado em manifests certificados antes de o conteúdo correspondente estar presente no mesmo commit ou num commit ancestor.

| Violação | Consequência |
|---|---|
| Manifest refere hash de working tree não commitado | **Certificação inválida** |
| Manifest refere hash de commit futuro | **Certificação inválida** |
| Manifest gerado por `sha256sum` sobre filesystem sem commit | **Proibido em baseline oficial** |

---

## 4. Tag

Toda baseline certificada deverá possuir tag Git anotada e imutável:

- formato: `CERTIFIED-BASELINE-NNN`
- criada no commit que contém simultaneamente os manifests e o conteúdo;
- protegida contra force-push e delete;
- publicada no remote oficial.

---

## 5. Manifest

Todo manifesto de hashes (`.sha256`) utilizado como referência de baseline:

- deve ser **gerado exclusivamente a partir do conteúdo commitado** (`git show <commit>:<path> | sha256sum`);
- nunca a partir de `sha256sum <file>` sobre working tree, a menos que imediatamente seguido de commit e validação cruzada;
- deve ser validável por terceiros sem acesso ao disco original.

Fluxo canónico:

```
commit → tag → git show <tag>:<path> | sha256sum → manifest gerado → commit manifest → validação cruzada
```

---

## 6. Storage

Toda baseline certificada deverá possuir:

- **cópia primária:** repositório Git (remote oficial);
- **cópia secundária:** pelo menos uma cópia independente validada por SHA-256 (pen drive, NAS, Object Storage, release asset ou equivalente);
- ambas registadas no pacote de certificação.

---

## 7. Custódia

Para cada baseline certificada, registar:

| Campo | Obrigatório |
|---|---|
| Responsável | SIM |
| Localização primária (Git remote + tag) | SIM |
| Localização secundária (backup) | SIM |
| Método de recuperação | SIM |
| Política de retenção | SIM |
| Data da última verificação | SIM |

---

## 8. Auditoria

Toda certificação deverá gerar um **pacote imutável** contendo:

- relatório de certificação (`.md`);
- manifest de hashes validados contra o commit;
- referência ao commit e tag;
- timestamp ISO 8601;
- identificação do responsável;
- SHA-256 do próprio relatório.

---

## 9. Processo de sincronização

Ao executar `integrity-check.sh --baseline` ou equivalente:

1. verificar que o working tree está **clean** (`git status --porcelain` vazio para os paths alvo);
2. gerar hashes do committed content (`git show HEAD:<path>`), não do filesystem;
3. ou, se gerado do filesystem, **commitá-lo imediatamente** e validar cruzado;
4. nunca publicar um commit com manifests cujos digests não correspondam ao conteúdo no mesmo commit.

---

## 10. Violações e remediação

| Situação | Acção |
|---|---|
| Hash certificado sem blob correspondente | **Cadeia de custódia rompida** — recertificação obrigatória |
| Manifest desalinhado do commit | **Corrigir** no próximo commit; **não** alterar histórico |
| Tag apagada ou movida | **Incidente de segurança** — investigar e recertificar |
| Cópia secundária perdida | **Restaurar** a partir do Git; recertificar storage |

---

## 11. Revisão

Esta política será revisada:

- a cada incidente de ruptura de custódia;
- a cada nova certificação de baseline;
- pelo menos anualmente.

---

*POLICY-BASELINE-LIFECYCLE-001 — estabelecida por ENT-GOV-002 para impedir certificação de estados transitórios irrecuperáveis.*
