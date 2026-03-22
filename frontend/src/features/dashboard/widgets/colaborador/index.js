/**
 * Registro de widgets do Dashboard Inteligente Dinâmico do Colaborador
 */
import TarefasDiaWidget from './TarefasDiaWidget';
import ProacaoWidget from './ProacaoWidget';
import MetaTurnoWidget from './MetaTurnoWidget';
import ProximasAtividadesWidget from './ProximasAtividadesWidget';
import CadastrarComIAWidgetComponent from '../CadastrarComIAWidget';
import InstrucoesWidget from './InstrucoesWidget';
import RegistroWidget from './RegistroWidget';
import AlertasWidget from './AlertasWidget';
import ChecklistSegurancaWidget from './ChecklistSegurancaWidget';
import ImpetusIAChatWidget from './ImpetusIAChatWidget';

export const COLABORADOR_WIDGET_MAP = {
  tarefas_dia: TarefasDiaWidget,
  proacao: ProacaoWidget,
  meta_turno: MetaTurnoWidget,
  proximas_atividades: ProximasAtividadesWidget,
  cadastrar_com_ia: CadastrarComIAWidgetComponent,
  instrucoes: InstrucoesWidget,
  registro: RegistroWidget,
  alertas: AlertasWidget,
  checklist_seguranca: ChecklistSegurancaWidget,
  impetus_ia_chat: ImpetusIAChatWidget
};

export function getColaboradorWidgetComponent(widgetId) {
  return COLABORADOR_WIDGET_MAP[widgetId] || null;
}
