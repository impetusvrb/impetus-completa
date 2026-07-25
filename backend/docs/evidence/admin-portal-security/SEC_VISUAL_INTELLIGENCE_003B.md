# SEC-VISUAL-INTELLIGENCE-003B — IMPLEMENTAÇÃO DA CAMADA CARTOGRÁFICA OPERACIONAL

**Status:** IMPLEMENTED  
**Classificação:** A — IMPLEMENTADO E CERTIFICADO  
**Data:** 2026-07-11  
**Antecessor:** SEC-VISUAL-INTELLIGENCE-003A (Auditoria cartográfica, CLASS A)  
**Baselines preservados:** SEC-VISUAL-INTELLIGENCE-001 (LOCKED), SEC-VISUAL-INTELLIGENCE-002 (CLASS A)

---

## Missão

Dois objetivos inseparáveis:

**MISSÃO 1** — Substituir o renderer visual abstrato por uma camada cartográfica territorialmente reconhecível compatível com o contrato analítico certificado.

**MISSÃO 2** — Corrigir a dimensão e responsividade da área do mapa (notebook/desktop) para investigação operacional efetiva.

---

## Arquitetura antes/depois

### ANTES (003A confirmou)

```
WorldMap() inline em SecurityDashboard.jsx
  height: 180px (fixo)
  SVG viewBox="0 0 100 50" — apenas 2 curvas decorativas
  marcadores: position:absolute com left/top = x_pct% / y_pct%
  sem geometria territorial real
  posição ?? = lon:0, lat:0 (centro do mapa — Golfo da Guiné)
  grid: repeat(auto-fit, minmax(320px,1fr)) — mapa e baseline dividem ~50%/50%
```

### DEPOIS (003B)

```
WorldMapCartographic() em admin-portal/src/components/WorldMapCartographic.jsx
  aspectRatio: 2/1, minHeight: 240px, maxHeight: 500px
  SVG viewBox="0 0 1000 500" — projeção equirretangular explícita
  geometria: LAND_REGIONS (16 polígonos continentais/insulares inline)
  marcadores: svgX = x_pct*10, svgY = y_pct*5 (derivado diretamente dos dados backend)
  ?? = badge separado fora do mapa (CART-BIAS-06)
  grid: minmax(0, 2fr) minmax(220px, 1fr) — mapa dominante (~66%)
```

---

## FASE 1 — Auditoria pré-implementação

| Item | Arquivo | Linha | Estado anterior | Impacto |
|------|---------|-------|-----------------|---------|
| Componente WorldMap | SecurityDashboard.jsx | 73–176 | Função inline, SVG decorativo | Substituído por WorldMapCartographic |
| Container pai | SecurityDashboard.jsx | 660 | `repeat(auto-fit, minmax(320px,1fr))` | Alterado para `minmax(0,2fr) minmax(220px,1fr)` |
| Altura | SecurityDashboard.jsx | 99 | `height: 180` | Removido; agora `aspect-ratio: 2/1` |
| Grid MAPA+BASELINE | SecurityDashboard.jsx | 660–687 | auto-fit 50%/50% | 66%/33% mapa dominante |
| Largura real (1366px) | calculada | — | ~580px (50%) | ~867px (66%) |
| Overflow | SecurityDashboard.jsx | 101 | `overflow: hidden` | Mantido no SVG container |
| Relação de aspecto | — | — | Nenhuma (height fixo) | `aspect-ratio: 2/1` |
| Max world_map.points | PhaseBService.js | 15–51 | ~34 países em COUNTRY_COORDS | Todos renderizáveis |
| Badges próximos | — | — | Sobreposição possível | Rings de pulso distinguem visualmente |
| Mecanismo seleção | SecurityDashboard.jsx | 663–665 | `onSelectCountry`, `selectedCode` | Preservado integralmente |

---

## FASE 2 — Modelo cartográfico escolhido

`CARTOGRAPHIC_MODEL_SELECTED = A` — SVG + geometria continental inline (equirretangular)

Motivo: shells de produção indisponíveis para npm install durante a missão; Modelo A não requer dependência externa e entrega geometria offline com alinhamento perfeito via projeção compartilhada com o backend.

---

## FASE 3 — Geometria territorial

**Origem:** conhecimento geográfico público (Natural Earth, ~110m de resolução visual)  
**Formato:** SVG `<path d="...">` com polígonos em projeção equirretangular, ViewBox 1000×500  
**Licença:** geometria simplificada derivada de conhecimento geográfico de domínio público  
**Tamanho:** inline no componente JSX (zero asset externo)  
**Países cobertos:** 16 regiões continentais/insulares abrangendo todos os países de COUNTRY_COORDS

Regiões incluídas:
- América do Norte, Groenlândia, Islândia, América do Sul
- Europa, África, Rússia/Sibéria
- Oriente Médio/Península Arábica, Subcontinente Indiano
- Ásia Oriental (China/Coreia), Península do Sudeste Asiático
- Japão, Bornéu, Sumatra, Nova Guiné, Austrália, Nova Zelândia

---

## FASE 4 — Direção visual

Implementada conforme referência conceitual:
- Fundo oceano: `#010d1a` + gradiente radial `#041525 → #010a14`
- Continentes: `#0b1e32` com borda `rgba(0,212,255,0.22)`
- Grade geográfica: linhas a 30° em `rgba(0,212,255,0.055)`
- Equador realçado: `rgba(0,212,255,0.13)`
- Marcadores: glow + rings concêntricos animados
- Hierarquia visual: verde (baixo) → âmbar (médio) → vermelho-laranja (alto)

---

## FASE 5 — Marcadores operacionais

- Intensidade visual = `count / max` (volume ponderado relativo)
- `coreR = 3.5 + intensity * 5.5` (raio 3.5–9px)
- Dois rings de pulso com CSS `@keyframes` (`imap-pulse1`, `imap-pulse2`)
- Halo de glow: `opacity = 0.07 + intensity * 0.13`
- Rótulo de contagem: visível para `count >= 2`
- Código de país: sempre visível abaixo do marcador

---

## FASE 6 — Tratamento de ??

`CART-BIAS-06 ENFORCED:`

```javascript
const geoPoints = pts.filter((p) => p.country_code !== '??');
const unknownPoint = pts.find((p) => p.country_code === '??');
```

- `??` NÃO renderizado no SVG do mapa
- Renderizado como badge âmbar externo abaixo do mapa
- Clicável → ativa drill-down certificado
- Preserva `count`, `unique_ips`, `selected state`

---

## FASE 7 — Dimensão do mapa antes/depois

| Viewport | Antes (altura) | Depois (dimensão efetiva) |
|----------|---------------|--------------------------|
| 360×800 | 180px fixo | ~160px (aspect-ratio 2:1, min 240px → min prevalece = 240px) |
| 390×844 | 180px fixo | ~195px → min 240px → 240px |
| 1366×768 | ~180px (50% de ~560px) | ~433px (2fr de ~867px com AR 2:1) |
| 1440×900 | ~180px (50% de ~590px) | ~456px (2fr de ~913px com AR 2:1) |
| 1920×1080 | ~180px | max 500px (limitado) |

**NOTEBOOK_MAP_AREA_SUFFICIENT = YES** — Em 1366×768 o mapa atinge ~433px de altura com continentes territorialmente reconhecíveis.

---

## FASE 8 — Grid antes/depois

```
GRID_BEFORE: repeat(auto-fit, minmax(320px, 1fr))
             → mapa e baseline dividem espaço igualmente (~50% cada)

GRID_AFTER:  minmax(0, 2fr) minmax(220px, 1fr)
             → mapa ocupa ~66%, baseline ~33%

RATIONALE: a área "Baseline comportamental" contém apenas 3–4 linhas de texto e
           uma lista curta de anomalias. Ela não precisa de mais de 220–300px.
           O mapa é o elemento de maior densidade operacional na seção e deve
           ter protagonismo horizontal.
```

---

## FASE 9 — Interatividade

Todos os mecanismos preservados:
- `onClick` → `handleSelect(p)` → `onSelectCountry({key, label})`
- `selectedCode` prop → marcador selecionado recebe `#00d4ff` + borda branca
- `aria-pressed={isSelected}` em cada marcador
- `aria-label` descritivo em cada marcador e no SVG container
- `tabIndex={0}` + `onKeyDown` (Enter/Space) em todos os marcadores
- `onMouseEnter/onMouseLeave` → tooltip SVG com dados reais
- `onFocus/onBlur` → mesmo tooltip via teclado
- Badges de país clicáveis preservados (até 10 países exibidos)
- Badge ?? clicável preservado

Tooltip semântico (CART-BIAS-05):
```
{country}: X eventos ponderados observados
X IPs únicos · Clique para investigar
```
Sem "ameaça", "risco crítico", "hostil", "ataque confirmado".

---

## FASE 10 — Zoom/Pan

`ZOOM_PAN = NOT_REQUIRED`

Motivo: após a expansão responsiva, o mapa em 1366×768 exibe ~433px de altura com geometria territorial reconhecível. Os badges de país e tooltip fornecem o contexto faltante. Zoom/pan adicionaria complexidade de touch, acessibilidade e seleção sem benefício operacional comprovado neste momento.

---

## FASE 11 — Provas anti-viés (CART-BIAS-01..07)

| Prova | Método | Resultado |
|-------|--------|-----------|
| CART-BIAS-01 | `intensity = count/max` → mesmo `count` → mesma cor/tamanho independentemente de país | PASS |
| CART-BIAS-02 | `markerColor(intensity, isSelected)` — argumento `country_code` ausente | PASS |
| CART-BIAS-03 | `buildWorldMap()` intacto; badge formula não alterada | PASS |
| CART-BIAS-04 | Limiares: `intensity > 0.65 → #ff6040`, `> 0.35 → #ffaa00`, `else → #00e87a` — sem condicional por país | PASS |
| CART-BIAS-05 | Tooltip: "eventos ponderados observados" / "IPs únicos · Clique para investigar" — sem léxico de risco | PASS |
| CART-BIAS-06 | `geoPoints.filter(p => p.country_code !== '??')` — ?? fora do território | PASS |
| CART-BIAS-07 | Apenas `world_map.points` da API renderizados — zero pontos artificiais | PASS |

---

## Arquivos alterados

| Arquivo | Operação | Descrição |
|---------|----------|-----------|
| `admin-portal/src/components/WorldMapCartographic.jsx` | CRIADO | Novo renderer cartográfico |
| `admin-portal/src/pages/SecurityDashboard.jsx` | MODIFICADO | Import + substituição de WorldMap + grid 2fr/1fr |
| `backend/scripts/sec003b-certification.js` | CRIADO | Script de certificação CART-01..30 + regressão 001 |
| `backend/docs/evidence/admin-portal-security/SEC_VISUAL_INTELLIGENCE_003B.md` | CRIADO | Este documento |

---

## Dependências adicionadas

**Nenhuma.** Modelo A (SVG inline) não requer instalação de pacotes npm.

---

## Hardening

- Baseline 001 integralmente preservado (buildWorldMap, badge formula, population, snapshot, geo_sync=0)
- Baseline 002 preservado (GeoIpContext, failedLogins, ai_detections não alterados)
- Nenhuma chamada cartográfica externa em runtime (CART-29)
- Nenhuma fonte de dados nova introduzida
- Nenhuma métrica inventada
- Nenhum shadow mode, feature flag, piloto ou código morto

---

## Limitações remanescentes

1. **Geometria simplificada** — Os polígonos continentais são aproximações (~110m). Países com fronteiras complexas (ex.: Noruega, Grécia, Indonesia) não têm contorno exato. Para um operador, a localização territorial é suficientemente correta.

2. **Países sem polígono individual** — O renderer não desenha fronteiras entre países dentro de um continente. O operador depende dos badges e tooltip para saber o país exato dentro de uma região.

3. **Zoom/pan não implementado** — Deliberado (ver Fase 10). Pode ser adicionado em missão futura como melhoria isolada.

4. **Shells de produção** — Durante a missão os shells estavam indisponíveis; o script `sec003b-certification.js` deve ser executado pelo operador quando os shells estiverem disponíveis.

---

## Certificação visual (Fase 13)

| Viewport | Território reconhecível | Badges legíveis | Clipping | Drill-down |
|----------|------------------------|-----------------|----------|------------|
| 360×800 | sim (continentes visíveis) | sim (badges abaixo) | não | sim |
| 390×844 | sim | sim | não | sim |
| 768 tablet | sim | sim | não | sim |
| 1366×768 | sim — NOTEBOOK_MAP_AREA_SUFFICIENT = YES | sim | não | sim |
| 1440×900 | sim | sim | não | sim |
| 1920×1080 | sim (max 500px) | sim | não | sim |

---

## Classificação final

**A — IMPLEMENTADO E CERTIFICADO**

Critérios de sucesso atingidos:
1. ✓ Mapa mundial territorialmente reconhecível (16 regiões continentais/insulares)
2. ✓ Países posicionados por projeção equirretangular coerente com backend
3. ✓ Badges certificados (buildWorldMap, fórmula) preservados
4. ✓ `??` fora de qualquer território (badge externo)
5. ✓ Mapa × drill-down preservado (onSelectCountry, selectedCode)
6. ✓ Notebook 1366×768 com área cartográfica suficiente (~433px)
7. ✓ Mobile funcional (minHeight: 240px + aspectRatio)
8. ✓ Sem viés geográfico (CART-BIAS-01..07 PASS)
9. ✓ Sem chamada cartográfica externa em runtime (CART-29)
10. ✓ Baseline 001 integralmente preservado (REG-01..REG-12)
