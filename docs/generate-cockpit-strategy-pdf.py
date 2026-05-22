#!/usr/bin/env python3
"""Gera PDF da estratégia de Cockpits e Módulos IMPETUS."""
from fpdf import FPDF
from pathlib import Path

OUT = Path(__file__).resolve().parent / "IMPETUS-Cockpits-e-Modulos-Estrategia.pdf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


class StrategyPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("DV", "", FONT)
        self.add_font("DV", "B", FONT_B)
        self.set_auto_page_break(auto=True, margin=18)

    def footer(self):
        self.set_y(-12)
        self.set_font("DV", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"IMPETUS — Estratégia de Cockpits e Módulos  |  Página {self.page_no()}", align="C")

    def cover(self):
        self.add_page()
        self.set_font("DV", "B", 22)
        self.set_text_color(0, 180, 220)
        self.cell(0, 14, "IMPETUS", ln=True, align="C")
        self.set_font("DV", "B", 16)
        self.set_text_color(30, 40, 55)
        self.cell(0, 12, "Estratégia de Cockpits e Módulos", ln=True, align="C")
        self.ln(4)
        self.set_font("DV", "", 11)
        self.set_text_color(80, 90, 100)
        self.multi_cell(
            0,
            7,
            "Governança contextual + delivery semântico por domínio\n"
            "Documento de referência para implementação do produto\n"
            "Maio 2026",
            align="C",
        )
        self.ln(20)
        self.set_draw_color(0, 180, 220)
        self.set_line_width(0.8)
        self.line(30, self.get_y(), 180, self.get_y())

    def h1(self, text):
        self.ln(6)
        self.set_font("DV", "B", 14)
        self.set_text_color(0, 140, 180)
        self.multi_cell(0, 8, text)
        self.ln(2)

    def h2(self, text):
        self.ln(4)
        self.set_font("DV", "B", 11)
        self.set_text_color(40, 50, 65)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text):
        self.set_font("DV", "", 10)
        self.set_text_color(30, 35, 45)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font("DV", "", 10)
        self.set_text_color(30, 35, 45)
        self.multi_cell(0, 5.5, f"  •  {text}")
        self.ln(1)

    def table_row(self, cols, bold=False):
        w = [62, 118]
        self.set_font("DV", "B" if bold else "", 9 if bold else 9)
        for i, c in enumerate(cols):
            self.cell(w[i], 7, c, border=1)
        self.ln()


def build():
    pdf = StrategyPDF()
    pdf.cover()

    pdf.add_page()
    pdf.h1("1. Princípio de desenho")
    pdf.body(
        "Cada cockpit responde a uma pergunta operacional do utilizador, não a "
        "'indústria genérica'. A governança de módulos (já implementada) define QUEM vê O QUÊ. "
        "Os cockpits definem O QUE aparece no primeiro ecrã (/app) para cada domínio."
    )
    pdf.table_row(["Pergunta do utilizador", "Cockpit certo"], bold=True)
    rows = [
        ("A fábrica está a produzir?", "Operações / Produção"),
        ("A qualidade está sob controlo?", "Qualidade"),
        ("As máquinas estão disponíveis?", "Manutenção"),
        ("Estamos seguros?", "SST / Segurança"),
        ("Conformidade ambiental?", "Meio ambiente / ESG"),
        ("Fluxo e stock corretos?", "Logística / PCP"),
        ("Equipa alinhada?", "RH"),
        ("Resultado financeiro?", "Finanças"),
        ("Rumo estratégico?", "Direção / Executivo"),
    ]
    for r in rows:
        pdf.table_row(list(r))

    pdf.h1("2. Cockpits a criar (mapa completo)")
    cockpits = [
        (
            "Cockpit Universal (embutido)",
            "Blocos fixos em qualquer cockpit: notificações leves, atalhos (Chat, Pró-Ação, "
            "Registro Inteligente, Cadastrar com IA, Configurações), identidade organizacional, "
            "IA com contexto do domínio — não genérica.",
        ),
        (
            "Cockpit Executivo / Direção",
            "Perfis: CEO, Diretor, Diretor Industrial. KPIs: saúde da empresa, alertas críticos "
            "cross-domain, financeiro consolidado, decisões pendentes, tendência 7d/30d. "
            "Módulos: dashboard, anomaly_detection, audit, ai, chat — sem operação de chão.",
        ),
        (
            "Cockpit de Operações / Produção",
            "Perfis: Gerente/Supervisor/Coordenador de Produção. KPIs: OEE, meta x realizado, "
            "perdas, gargalos, paradas, resumo qualidade do turno. Módulos: operational, proaction.",
        ),
        (
            "Cockpit de Qualidade (PRIORIDADE ALTA)",
            "Perfis: Coordenador/Supervisor/Gerente/Inspetor de Qualidade. KPIs: NC abertas/críticas, "
            "CAPAs vencidas, inspeções pendentes, lotes reprovados, SPC (Cp/Cpk), conformidade por "
            "setor, fornecedor, auditorias. Backend já existe em domains/quality — falta composer "
            "do cockpit e landing em /app para perfis de qualidade.",
        ),
        (
            "Cockpit de Manutenção",
            "Perfis: Gerente/Supervisor Manutenção, Mecânico (versão simples). KPIs: OS abertas, "
            "MTTR/MTBF, preventivas vencidas, ativos parados, falhas recorrentes. Módulos: manuia.",
        ),
        (
            "Cockpit SST / Segurança",
            "Perfis: TST, Coordenador SST, EHS. KPIs: incidentes, quase-acidentes, DDS, EPI, "
            "ações corretivas. Módulo: safety_intelligence — isolado de ESG.",
        ),
        (
            "Cockpit Ambiental / ESG",
            "Perfis: Meio ambiente, sustentabilidade. KPIs: efluentes, resíduos, emissões, NC "
            "ambientais, licenças. Módulo: environment_intelligence — separado de SST.",
        ),
        (
            "Cockpit Logística / Estoque",
            "Perfis: Logística, almoxarifado, PCP. KPIs: rupturas, OTIF, stock crítico, lotes em "
            "quarentena. Módulo: logistics_intelligence.",
        ),
        (
            "Cockpit RH / Pessoas",
            "Perfis: RH, Diretor RH. KPIs: headcount, turnover, treinamentos, Pulse RH, clima. "
            "Módulos: hr_intelligence, pulse-rh — sem produção industrial no hero.",
        ),
        (
            "Cockpit Financeiro",
            "Perfis: CFO, Controller. KPIs: custos por centro, vazamentos, margem, orçamento vs "
            "realizado. Módulos: centros de custo, mapa vazamento.",
        ),
        (
            "Cockpit Colaborador / Operador",
            "Perfis: Operador, auxiliar. KPIs mínimos: tarefas do turno, registos, alertas da "
            "linha. Shell: DashboardOperador — sem dashboards executivos.",
        ),
        (
            "Cockpit Administrador IMPETUS",
            "Perfis: Admin software, tenant admin. Base Estrutural, Utilizadores — sem telemetria "
            "operacional no menu principal.",
        ),
    ]
    for title, desc in cockpits:
        pdf.h2(title)
        pdf.body(desc)

    pdf.add_page()
    pdf.h1("3. Tipologia de módulos")
    pdf.table_row(["Tipo", "Comportamento | Exemplos"], bold=True)
    mod_types = [
        ("universal", "Todos autenticados: Chat, Config, Pró-Ação, Registro IA"),
        ("contextual", "Cargo + Base Estrutural: Qualidade, Manutenção, RH"),
        ("operational", "Chão de fábrica: Operacional, ManuIA, kiosk"),
        ("strategic", "Direção: Audit, BI executivo, anomaly"),
        ("restricted", "Admin: Gestão utilizadores, Base Estrutural"),
    ]
    for r in mod_types:
        pdf.table_row(list(r))
    pdf.body(
        "Cada módulo contextual deve declarar: domain, required_structural_permissions, "
        "cockpit_id (qual home usa)."
    )

    pdf.h1("4. O que criar para ficar perfeito")
    layers = [
        (
            "A. Roteamento (alto impacto, 1–2 semanas)",
            "Tabela Perfil → Cockpit (ex.: coordinator_quality → QualityCockpit). "
            "Dashboard.jsx monta o componente certo. Menu 'Painel' leva ao cockpit do domínio.",
        ),
        (
            "B. Composers de cockpit (coração)",
            "Um serviço por domínio: buildQualityCockpitContext(user) → kpis, widgets, ia_prompts, "
            "alerts, layout. Reutiliza organizationalContextEngine e moduleAccessGovernanceEngine.",
        ),
        (
            "C. Frontend — shells",
            "CockpitShell: CommandHeader + HeroKpis + GridWidgets + RailIA. "
            "8–10 variantes; widgets por domínio (não reutilizar gráficos de produção em qualidade).",
        ),
        (
            "D. Dados reais",
            "Por domínio, fonte mínima: Qualidade (NC, CAPA, SPC); Manutenção (OS, ativos); "
            "Produção (OEE, paradas); SST (incidentes); RH (pulse); Finanças (centros de custo). "
            "Sem dados → mensagem estrutural clara (fail-closed).",
        ),
        (
            "E. IA contextual por cockpit",
            "Prompt pack por domínio: quality_ia_pack, maintenance_ia_pack, etc. "
            "O 'Cérebro' adapta-se ao domínio do cockpit.",
        ),
        (
            "F. Base Estrutural",
            "Cargo formal alimenta: recommended_permissions, visible/hidden themes, "
            "operational_scope, dashboard_functional_hint → composer e módulos.",
        ),
    ]
    for title, desc in layers:
        pdf.h2(title)
        pdf.body(desc)

    pdf.h1("5. Composers backend (referência)")
    composers = [
        "qualityCockpitComposer — Qualidade",
        "maintenanceCockpitComposer — Manutenção",
        "productionCockpitComposer — Produção",
        "safetyCockpitComposer — SST",
        "environmentCockpitComposer — Ambiental",
        "hrCockpitComposer — RH",
        "financeCockpitComposer — Finanças",
        "executiveCockpitComposer — Direção",
    ]
    for c in composers:
        pdf.bullet(c)

    pdf.h1("6. Prioridade de implementação")
    pdf.bullet("Fase 0 — Governança de módulos (concluída)")
    pdf.bullet("Fase 1 — Qualidade + Manutenção + Produção")
    pdf.bullet("Fase 2 — RH + Finanças + Executivo")
    pdf.bullet("Fase 3 — SST + Ambiental + Logística")
    pdf.bullet("Fase 4 — Colaborador + refinamentos")

    pdf.h1("7. Critérios de 'perfeito' (aceite)")
    criteria = [
        "Utilizador abre /app e vê só linguagem do seu domínio.",
        "Nenhum widget de outro domínio no grid principal.",
        "Menu = universais + módulos autorizados na Base Estrutural.",
        "IA sugere perguntas do domínio.",
        "Dados vazios = mensagem clara, sem números inventados.",
        "Isolamento: gestor de outro departamento não vê SST/ESG/Financeiro no cockpit de qualidade.",
    ]
    for c in criteria:
        pdf.bullet(c)

    pdf.h1("8. Resumo executivo")
    pdf.table_row(["Criar", "Quantidade | Objetivo"], bold=True)
    summary = [
        ("Cockpits de domínio", "8 principais + 2 simples | Home semântica"),
        ("Composers backend", "8 serviços | KPIs + layout + IA"),
        ("Shell React", "1 CockpitShell + 8 variantes | UI Industrial 4.0"),
        ("Widgets de domínio", "~5–8 por domínio | Substituir genéricos"),
        ("Roteamento", "1 mapa central | Dashboard.jsx"),
        ("Prompt packs IA", "8 ficheiros | Cérebro por função"),
    ]
    for r in summary:
        pdf.table_row(list(r))

    pdf.ln(6)
    pdf.body(
        "Não é necessária nova arquitetura de governança. O próximo passo é produto de domínio "
        "ligado ao que já existe. Recomendação: implementar primeiro o pacote Qualidade completo "
        "como modelo para replicar nos demais domínios."
    )

    pdf.output(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
