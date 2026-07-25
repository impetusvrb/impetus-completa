# SEC-VISUAL-INTELLIGENCE-003A — Auditoria Cartográfica do World Map

**Status:** AUDIT COMPLETE  
**Classificação:** A — Fronteira cartográfica integralmente mapeada  
**Data:** 2026-07-11  
**Alteração funcional:** NÃO  
**Próximo passo:** AWAITING_VISUAL_REFERENCE_REVIEW

---

## 1. Renderer real atual

### Fluxo completo (nomes reais)

```
collectSecurityEvidence()
  └─ phaseBSvc.buildWorldMap(originsWithGeo, blockedWithGeo, alertsForWorldMap)
       └─ projectCoord(country_code)          [adminPortalSecurityPhaseBService.js:65-72]
       └─ retorna world_map.points[]          [schema world_map_v1]

buildDashboard()
  └─ phase_b.world_map = evidence.world_map  [adminPortalSecurityDashboardService.js:764-766]
       (substitui world_map duplicado de buildPhaseBPayload)

SecurityDashboard.jsx
  └─ pb = data.phase_b
  └─ <WorldMap points={pb.world_map?.points} />   [linha 763-767]

WorldMap (componente inline, SecurityDashboard.jsx:73-176)
  └─ div position:relative height:180px + gradient CSS
  └─ svg viewBox="0 0 100 50" — 2 paths decorativos (linhas Bézier)
  └─ pts.map → <button position:absolute left={x_pct}% top={y_pct}% />
  └─ pts.slice(0,8) → badges texto clicáveis abaixo do mapa
```

### Imports / bibliotecas / assets

| Item | Valor |
|---|---|
| Componente React | `WorldMap` — função inline em `admin-portal/src/pages/SecurityDashboard.jsx` |
| Biblioteca cartográfica | **Nenhuma** |
| Canvas | **Não** |
| GeoJSON / TopoJSON | **Não** |
| Imagem de fundo | **Não** — `linear-gradient` CSS |
| SVG | **Sim** — 2 `<path>` decorativos sem geometria de países |
| CSS externo do mapa | **Não** — estilos inline + tokens (`var(--red)`, `var(--cyan)`) |

---

## 2. Projeção atual

```
CURRENT_MAP_PROJECTION = HARDCODED_COORDINATES + Equirectangular (plate carrée) simplificada
```

Classificação composta:
- `HARDCODED_COORDINATES` — tabela `COUNTRY_COORDS` (35 entradas ISO2)
- `CSS_APPROXIMATION` — posicionamento `%` sobre caixa 2:1 sem geometria
- `SIMPLIFIED_SVG` — contorno abstrato (2 curvas), não continentes

**Não existe projeção cartográfica real aplicada a geometria de países.**

A função `projectCoord` aplica matemática equirectangular a centroides hardcoded:

```javascript
// adminPortalSecurityPhaseBService.js:65-72
x_pct = ((lon + 180) / 360) * 100
y_pct = ((90 - lat) / 180) * 100
```

Equivalente a **Equirectangular** sobre ponto único (centroide aproximado), não sobre polígonos.

---

## 3. Geometria disponível

```
COUNTRY_GEOMETRY_AVAILABLE = NO
```

Verificado:
- Zero ficheiros `.geojson` / `.topojson` em `admin-portal/`
- Zero SVG paths por país
- Zero assets cartográficos no repositório
- `COUNTRY_COORDS` contém **35 ISO2** com lat/lon aproximados (não geometria)

Países fora da tabela + `??` → fallback `{ lat: 0, lon: 0 }`.

---

## 4. Posicionamento dos badges

```
BADGE_POSITIONING = HARDCODED
```

| country_code | lat (fonte) | lon (fonte) | x_pct | y_pct | Transformação |
|---|---|---|---|---|---|
| CA | 56.13 | -106.35 | **20.5%** | **18.8%** | projectCoord |
| US | 37.09 | -95.71 | **23.4%** | **29.4%** | projectCoord |
| FR | 46.23 | 2.21 | **50.6%** | **24.3%** | projectCoord |
| BR | -14.24 | -51.93 | **35.6%** | **57.9%** | projectCoord |
| VN | 14.06 | 108.28 | **80.1%** | **42.2%** | projectCoord |
| ?? | 0 (fallback) | 0 (fallback) | **50.0%** | **50.0%** | projectCoord fallback |

**Imprecisões visuais comprovadas:**
1. Centroides são aproximações administrativas, não centroides geográficos de polígono
2. Sem contorno de países, o operador não pode correlacionar ponto × território
3. Países ausentes de `COUNTRY_COORDS` colapsam para `(50%, 50%)` — mesma posição que `??`
4. Proporção visual 2:1 (viewBox 100×50) alinha com equirectangular, mas **sem mapa base** os pontos flutuam num gradiente

---

## 5. Estado ?? — risco semântico visual

```
UNKNOWN_GEO_VISUAL_POSITION = CENTER_OF_VIEWPORT (50%, 50%) — lat/lon (0, 0)
```

Código (`projectCoord`, linha 67):
```javascript
const c = COUNTRY_COORDS[cc] || { lat: 0, lon: 0 };
```

**SEMANTIC_VISUAL_RISK = CONFIRMED**

O grupo `??` (IPs sem GeoIP comprovado) é renderizado em `(50%, 50%)` — centro do viewport cartográfico, geograficamente próximo do Golfo da Guiné / intersecção equador-primeiro meridiano. **Não representa território desconhecido** — representa coordenada arbitrária que **sobrepor-se-á visualmente a África ocidental** se um mapa real for adicionado sem corrigir a camada visual.

Label analítico: `country = 'Desconhecido'` (correto, certificado 001). Posição visual: **incorreta semanticamente**.

---

## 6. Problema visual comprovado (causa raiz)

| Causa | Evidência | Contribui |
|---|---|---|
| Ausência de contorno real dos continentes | SVG = 2 curvas decorativas | **SIM — principal** |
| Mapa abstrato | Gradient + curvas, sem geografia | **SIM — principal** |
| Coordenadas hardcoded | `COUNTRY_COORDS` 35 países | **SIM** |
| Projeção sem geometria | Equirectangular em centroides isolados | **SIM** |
| Baixa relação ponto × território | Zero polígonos de referência | **SIM — principal** |
| Posicionamento ?? em (0,0) | Fallback projectCoord | **SIM — risco semântico** |
| Densidade/sobreposição | Múltiplos países europeus próximos em % | PARCIAL |
| Ausência de labels no mapa | Só badges texto abaixo (max 8) | **SIM** |
| Ausência de zoom/pan | Não implementado | **SIM** |
| Altura fixa 180px | Inline style | PARCIAL (mobile) |
| Cor vermelha | Volume, não severidade | **SIM — ambiguidade** |

**Conclusão:** O problema observado pelo operador é **estruturalmente causado** pela ausência de geometria cartográfica e pela camada visual puramente abstrata. Não é bug de projeção sobre geometria real — é **ausência de geometria**.

---

## 7. Responsividade (AUD-006)

Análise estrutural do código (sem alteração CSS):

| Viewport | Mapa visível | Continentes identificáveis | Badge legível | Sobreposição | Clipping | Proporção |
|---|---|---|---|---|---|---|
| 360×800 | SIM (grid minmax 320px → ~328px) | **NÃO** | SIM (8 badges max) | Possível EU cluster | overflow:hidden no container | 2:1 preservada |
| 390×844 | SIM | **NÃO** | SIM | idem | idem | idem |
| tablet | SIM (2 colunas possíveis) | **NÃO** | SIM | menor | idem | idem |
| desktop | SIM | **NÃO** | SIM | menor | idem | idem |

- Grid pai: `minmax(320px, 1fr)` — mapa ocupa coluna inteira em mobile
- Altura fixa: **180px** — não escala com viewport
- Pontos: `%` absoluto — escalam horizontalmente, mantêm posição relativa
- Área clicável: `6–20px` (size = 6 + count/max×14) — **pequena em mobile**
- Sem `@media` queries no componente `WorldMap`

---

## 8. Interatividade (AUD-007)

| Recurso | Estado | Evidência |
|---|---|---|
| click (mapa) | **IMPLEMENTED** | `<button onClick={() => onSelectCountry(...)}>` L117 |
| click (badge texto) | **IMPLEMENTED** | `<button onClick>` L148 |
| hover | **PARTIAL** | `title` nativo L114; sem estado visual hover |
| tooltip | **PARTIAL** | `title` attribute apenas |
| zoom | **ABSENT** | — |
| pan | **ABSENT** | — |
| keyboard | **PARTIAL** | `tabIndex={0}` nos badges L145; botões mapa focusáveis |
| touch | **IMPLEMENTED** | botões HTML nativos |
| focus ring | **PARTIAL** | sem estilo focus customizado |
| aria-label | **IMPLEMENTED** | L115-116, L147 |
| aria-pressed | **IMPLEMENTED** | selected state L116, L146 |
| selected country | **IMPLEMENTED** | `selectedCode`, cyan highlight |
| drill-down | **IMPLEMENTED** | `SecurityEvidenceDrilldown` L792-798 |

Toggle seleção: click no mesmo país desseleciona (`handleSelectCountry` L416-419).

---

## 9. Semântica do vermelho (AUD-008)

Código (`WorldMap` L122-128):

```javascript
background: isSelected
  ? 'rgba(0,212,255,0.9)'                    // selecionado = cyan
  : `rgba(255,64,64,${0.35 + intensity * 0.55})`  // intensity = count/max
border: isSelected ? 'var(--cyan)' : 'var(--red)'
```

| Pergunta | Resposta comprovada |
|---|---|
| Vermelho = risco? | **NÃO** — não consulta severity, riskScore, classification |
| Vermelho = volume? | **SIM** — opacidade proporcional a `count/max` |
| Cor fixa? | Base vermelha fixa; opacidade varia |
| Varia por severidade? | **NÃO** |
| Legenda? | **ABSENT** |
| Dependência exclusiva de cor? | **SIM** — sem label no ponto do mapa |
| Contraste | Red sobre fundo escuro — adequado; selecionado cyan |

```
SEMANTIC_COLOR_AMBIGUITY = CONFIRMED
```

Num contexto de Centro de Segurança, vermelho **aparenta** alarme/risco, mas o código representa **volume relativo de eventos** (badge count). Não há legenda que disambigüe.

---

## 10. Fronteira certificada × substituível (AUD-009)

| Componente | Analítico / Visual | Certificado 001 | Pode substituir? |
|---|---|---|---|
| `world_map.points` | **Analítico** | SIM | **NÃO** — contrato API |
| `buildWorldMap` | **Analítico** | SIM | **NÃO** |
| Fórmula badges (nx×1+bl×2+al×1) | **Analítico** | SIM | **NÃO** |
| `country_code` | **Analítico** | SIM | **NÃO** |
| `count` / `unique_ips` | **Analítico** | SIM | **NÃO** |
| `snapshot_id` | **Analítico** | SIM | **NÃO** |
| `index_matches_badge` | **Analítico** | SIM | **NÃO** |
| `x_pct` / `y_pct` | **Misto** | SIM (001) | **SUBSTITUÍVEL na camada visual** se novo renderer derivar posição de `country_code` + geometria real, mantendo payload intacto |
| Mapa base (gradient+SVG) | **Visual** | NÃO | **SIM** |
| Geometria países | **Visual** | NÃO | **SIM** (adicionar) |
| Projeção visual | **Visual** | NÃO | **SIM** (desde que não altere buildWorldMap) |
| Renderer `WorldMap` | **Visual** | NÃO | **SIM** |
| Markers/badges visuais | **Visual** | NÃO | **SIM** |
| Tooltip/hover UI | **Visual** | NÃO | **SIM** |
| Zoom/pan | **Visual** | NÃO | **SIM** (adicionar) |
| CSS do mapa | **Visual** | NÃO | **SIM** |
| Cor dos markers | **Visual** | NÃO | **SIM** (com cuidado semântico) |
| Posição visual de `??` | **Visual** | NÃO | **SIM — obrigatório corrigir** |

### Contrato de dados certificado (não alterar)

```typescript
world_map: {
  schema_version: 'world_map_v1',
  total_countries: number,
  total_events: number,
  points: [{
    country_code: string,   // inclui '??', 'LO'
    country: string,
    count: number,          // badge = índice ponderado
    unique_ips: number,
    x_pct: number,          // posição actual hardcoded
    y_pct: number
  }]
}
```

### Fronteira explícita

```
CERTIFIED DATA CONTRACT (world_map.points + drill-down por country_code)
        ↓
REPLACEABLE CARTOGRAPHIC VIEW (WorldMap component + map base + projection visual + markers)
```

---

## 11. Modelos arquiteturais (comparação técnica — sem escolha de design)

### MODELO A — SVG cartográfico local (GeoJSON/TopoJSON)

| Critério | Avaliação |
|---|---|
| Aderência ao contrato 001 | **Alta** — consome `country_code` + `count`; posição visual derivada de geometria |
| Bundle | +50–200KB (TopoJSON world 110m) |
| Performance | Boa para ≤30 pontos |
| Offline / CSP | Compatível (asset local) |
| Risco `??` | Resolvível — posição off-map ou ícone separado |
| **Compatível** | **SIM** |

### MODELO B — Biblioteca cartográfica React (d3-geo, react-simple-maps)

| Critério | Avaliação |
|---|---|
| Aderência | Alta se wrapper consumir `world_map.points` |
| Bundle | +30–100KB gzip |
| Dependências | Nova (não instalada nesta missão) |
| CSP | Verificar inline SVG policies |
| **Compatível** | **SIM** |

### MODELO C — Asset visual + overlay georreferenciado

| Critério | Avaliação |
|---|---|
| Aderência | Média — risco de desalinhamento |
| coordinate alignment | **ALTO RISCO** se asset não for equirectangular 2:1 exacto |
| `x_pct/y_pct` actuais | Assumem equirectangular sobre centroides; asset PNG/SVG estilizado pode não coincidir |
| **Compatível** | **PARCIAL** — requer calibração ou abandono de x_pct/y_pct na camada visual |

### MODELO D — Renderer actual refinado

| Critério | Avaliação |
|---|---|
| Aderência | Máxima (menor diff) |
| Limitação | Sem geometria real, refinamento tem tecto baixo |
| Contornos | Possível SVG world simplificado manual, mas impreciso |
| **Compatível** | **SIM (limitado)** — não resolve problema principal sem geometria |

```
ARCHITECTURALLY_COMPATIBLE_MODELS = [A, B, D-limited]
ARCHITECTURALLY_INCOMPATIBLE_MODELS = [C-without-calibration]
ARCHITECTURALLY_CONDITIONAL_MODELS = [C-with-equirectangular-2:1-asset]
```

**Não declarado:** BEST DESIGN = X

---

## 12. Riscos por modelo

| Risco | A | B | C | D |
|---|---|---|---|---|
| coordinate alignment | Baixo | Baixo | **Alto** | Médio |
| CSP | Baixo | Médio | Baixo | Baixo |
| bundle | Médio | Médio | Baixo | Baixo |
| performance mobile | Baixo | Baixo | Baixo | Baixo |
| accessibility | Médio (implementar) | Médio | Médio | Baixo |
| snapshot semantics | Baixo se country_code preserved | Baixo | Médio | Baixo |
| REG-01..12 baseline | Baixo se buildWorldMap intocado | Baixo | Baixo | Baixo |
| ?? semantic fix | Obrigatório em todos | Obrigatório em todos | Obrigatório | Obrigatório |

---

## 13. Baseline

| Baseline | Estado |
|---|---|
| SEC-VISUAL-INTELLIGENCE-001 | **PRESERVED** — zero alteração de código funcional nesta missão |
| SEC-VISUAL-INTELLIGENCE-002 | **PRESERVED** — zero alteração |

Regressão: nenhuma alteração de produção. Regressão inline confirmada por inspecção de código — `buildWorldMap`, badges, geo_sync, failedLogins geo intactos.

Script diagnóstico criado: `backend/scripts/sec003a-cartographic-audit.js` (read-only, não-runtime).

---

## 14. Invariante proposta para 003B (implementação futura)

```
INV-SVI3-001 — CARTOGRAPHIC_VIEW_CONSUMES_ANALYTICAL_CONTRACT
O renderer visual consome world_map.points e country_code.
Não redefine count, badges, população analítica nem snapshot_id.

INV-SVI3-002 — UNKNOWN_GEO_NO_TERRITORY_PLACEMENT
?? e GEO_NOT_ENRICHED não podem ser posicionados sobre território nacional específico.

INV-SVI3-003 — COLOR_IS_VOLUME_NOT_RISK
Cor/intensidade visual do marker representa volume relativo (count), não severidade.
Legenda obrigatória se cor alarmistica mantida.
```

---

## 15. Arquivos criados

| Arquivo | Tipo |
|---|---|
| `backend/docs/evidence/admin-portal-security/SEC_VISUAL_INTELLIGENCE_003A.md` | Documento de auditoria |
| `backend/scripts/sec003a-cartographic-audit.js` | DIAGNOSTIC_ONLY |

**ALTERAÇÃO FUNCIONAL DO PRODUTO: NÃO**

---

## 16. Classificação final

**A — FRONTEIRA CARTOGRÁFICA INTEGRALMENTE MAPEADA**

**AWAITING_VISUAL_REFERENCE_REVIEW**

O novo mapa deverá consumir o contrato `world_map` existente — e não redefinir a verdade analítica certificada.
