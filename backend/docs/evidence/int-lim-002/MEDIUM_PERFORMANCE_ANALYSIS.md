# MEDIUM_PERFORMANCE_ANALYSIS

**Emitido em:** 2026-07-23 16:45 UTC  
**Fase:** INT-LIM-002  

---

## 1. Novos Watchers Adicionados

**Watchers adicionados especificamente para INT-LIM-002:** 0

A cobertura dos activos MEDIUM foi alcançada integralmente através de:
- Regras pré-existentes (`impetus_repo_write`)
- Regra adicionada em INT-LIM-001 (`impetus_tls_config`)

Não foi necessário adicionar nenhum novo watcher, rule, ou componente de código.

---

## 2. Impacto em Performance

| Métrica | Variação |
|---|---|
| Regras auditd adicionadas | 0 |
| Componentes de código alterados | 0 |
| Watchers `fs.watch` adicionados | 0 |
| Overhead de CPU | 0 |
| Overhead de memória | 0 |
| Eventos adicionais por dia (estimativa) | 0 |

**Impacto total de INT-LIM-002:** nulo.

---

## 3. Estado do Backlog auditd

| Parâmetro | Valor pós-INT-LIM-002 |
|---|---|
| backlog | 0 |
| lost | 0 |
| backlog_limit | 16384 |
| Regras activas totais | 20 (inalteradas desde INT-LIM-001) |

---

## 4. Análise por Activo

| ID | Ficheiros | Freq. alteração | Impacto por evento |
|---|---|---|---|
| INT-M-001 (routes) | 303 | Deploy (raro) | Baixo — batch de alterações em deploy |
| INT-M-002 (middleware) | 48 | Deploy (raro) | Baixo |
| INT-M-003 (audit.rules) | 1 | Evolução de regras (muito raro) | Negligível |
| INT-M-004 (TLS cert) | 1 | Renovação mensal automática | Negligível |
| INT-M-005 (security config) | 1 | Configuração (muito raro) | Negligível |

---

## 5. Conclusão

`PERFORMANCE_IMPACT = ZERO`  
`NO_NEW_WATCHERS_REQUIRED = TRUE`  
`ARCHITECTURE_REUSE = TRUE`  
`MEDIUM_COVERAGE_ACHIEVED_VIA_EXISTING_RULES = TRUE`
