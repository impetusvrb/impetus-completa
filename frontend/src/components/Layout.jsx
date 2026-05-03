/**
 * LAYOUT PRINCIPAL
 * Sidebar + Header + Conteúdo
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap,
  MessageSquare, 
  Brain, 
  Settings,
  Wrench,
  Bell,
  User,
  Users,
  Building2,
  ScrollText,
  FileText,
  FolderOpen,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Target,
  AlertTriangle,
  Mail,
  ExternalLink,
  Layers,
  FileEdit,
  ClipboardList,
  Cpu,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Upload,
  Mic,
  Smartphone,
  Shield,
  Activity,
  ChevronLeft,
  KeyRound,
  Palette,
  Monitor,
  UsersRound
} from 'lucide-react';
import { companies, auth } from '../services/api';
import FactoryTeamOperatorBar from './FactoryTeamOperatorBar';
import { mergeUserRoleFromJwt } from '../utils/systemHealthAccess';
import { useVisibleModules } from '../hooks/useVisibleModules';
import { prefetchRoute } from '../utils/prefetchRoutes';
import { resolveMenuRole, isMaintenanceProfile, isColaboradorSimples, shouldOfferPulseRhMenu, isStrictAdminRole } from '../utils/roleUtils';
import ImpetusPulseModal from '../features/pulse/ImpetusPulseModal';
import ImpetusPulseSupervisorModal from '../features/pulse/ImpetusPulseSupervisorModal';
import { useImpetusPulse } from '../features/pulse/useImpetusPulse';
import { useImpetusPulseSupervisor } from '../features/pulse/useImpetusPulseSupervisor';
import { useImpetusVoice } from '../voice/ImpetusVoiceContext';
import chatSidebarIcon from '../assets/chat-sidebar-icon.png';
import './Layout.css';

const IA_FACE_VIDEO = '/ia-face-1.mp4';

/** Garante no máximo um item por rota (evita duplicatas no menu lateral). */
function dedupeMenuItemsByPath(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (item.settingsBack || item.settingsAnchor) {
      out.push(item);
      continue;
    }
    const p = (item.path || '').replace(/\/+$/, '') || '/';
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(item);
  }
  return out;
}

function parseImpetusUser() {
  try {
    const userStr = localStorage.getItem('impetus_user');
    if (!userStr || !userStr.trim()) return { name: 'Usuário', role: 'colaborador' };
    const u = JSON.parse(userStr);
    if (!u || typeof u !== 'object') return { name: 'Usuário', role: 'colaborador' };
    return mergeUserRoleFromJwt(u);
  } catch {
    return { name: 'Usuário', role: 'colaborador' };
  }
}

/** max-width: 1023px — sidebar em overlay/drawer (tablet + mobile). */
const MQ_NAV_DRAWER = '(max-width: 1023px)';

function useMatchMedia(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return matches;
}

/** Na tela de configurações do usuário, sidebar mostra só navegação da conta (sem admin/IA/conteúdo institucional). */
const USER_SETTINGS_FOCUS_NAV = [
  { hash: 'us-perfil', label: 'Perfil', icon: User },
  { hash: 'us-seguranca', label: 'Segurança', icon: Shield },
  { hash: 'us-notificacoes', label: 'Notificações', icon: Bell },
  { hash: 'us-canais', label: 'Canais de acesso', icon: KeyRound },
  { hash: 'us-preferencias', label: 'Preferências', icon: Palette },
  { hash: 'us-dispositivos', label: 'Dispositivos', icon: Monitor }
];

export default function Layout({ children }) {
  const { openOverlay, voiceEnabled: voiceUiEnabled, wakePhraseIssue } = useImpetusVoice();
  const [wakeHttpBannerDismissed, setWakeHttpBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('impetus_wake_http_dismiss') === '1';
    } catch {
      return false;
    }
  });
  const showWakeHttpBanner =
    voiceUiEnabled && wakePhraseIssue === 'insecure' && !wakeHttpBannerDismissed;
  const pulseUi = useImpetusPulse();
  const pulseSup = useImpetusPulseSupervisor();
  const [pulseSupItem, setPulseSupItem] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isNarrowViewport = useMatchMedia(MQ_NAV_DRAWER);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia(MQ_NAV_DRAWER).matches;
  });
  const [notificationCount] = useState(0);
  const [subscriptionOverdue, setSubscriptionOverdue] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const headerDropdownRef = useRef(null);

  const pathNormRoot = (location.pathname || '').replace(/\/+$/, '') || '/';
  const isUserSettingsFocus = pathNormRoot === '/app/settings';
  const [settingsNavHash, setSettingsNavHash] = useState('us-perfil');

  useEffect(() => {
    if (!isUserSettingsFocus) return;
    const sync = () => setSettingsNavHash((window.location.hash || '').replace(/^#/, '') || 'us-perfil');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [isUserSettingsFocus, location.pathname]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const iaVideoSrc = IA_FACE_VIDEO;

  useEffect(() => {
    if (isNarrowViewport) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isNarrowViewport]);

  useEffect(() => {
    if (!isNarrowViewport || !sidebarOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isNarrowViewport, sidebarOpen]);

  useEffect(() => {
    if (!isNarrowViewport || !sidebarOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isNarrowViewport, sidebarOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowProfile(false);
        setShowHelp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeSidebarAfterNav = useCallback(() => {
    if (window.matchMedia(MQ_NAV_DRAWER).matches) {
      setSidebarOpen(false);
    }
  }, []);

  const { filterMenu, canAccessPath, loading: modulesLoading, maintenanceFromProfile, visibleModules } =
    useVisibleModules();

  /** Recarrega quando o dashboard gravar perfil no localStorage ou ao mudar de rota (evita menu admin errado). */
  const user = useMemo(
    () => parseImpetusUser(),
    [location.pathname, modulesLoading, visibleModules]
  );

  useEffect(() => {
    companies.getMe().then((r) => {
      if (r?.data?.company?.subscription_status === 'overdue') {
        setSubscriptionOverdue(true);
      }
    }).catch(() => {});
  }, []);

  const role = resolveMenuRole(user);
  const dashboardProfile = String(user?.dashboard_profile || '').toLowerCase();
  const functionalArea = String(user?.functional_area || user?.area || '').toLowerCase();
  const canAccessIndustrialCoreModules =
    role === 'ceo' ||
    (role === 'diretor' && (
      dashboardProfile === 'director_industrial' ||
      dashboardProfile === 'director_operations' ||
      functionalArea.includes('industrial') ||
      functionalArea.includes('operations') ||
      functionalArea.includes('operacoes')
    ));
  const INDUSTRIAL_CORE_PATHS = new Set([
    '/app/centro-operacoes-industrial',
    '/app/cerebro-operacional',
    '/app/insights'
  ]);
  const maintenanceProfile = isMaintenanceProfile(user) || maintenanceFromProfile;
  const maintenanceTechnicianMenu = maintenanceProfile && resolveMenuRole(user) === 'colaborador';

  const rawPath = location.pathname || '/';
  const normalizedPath = rawPath.replace(/\/+$/, '') || '/';
  const allowManuiaByMaintenance =
    maintenanceProfile &&
    (normalizedPath.startsWith('/app/manutencao/manuia') || normalizedPath.startsWith('/app/manutencao/manuia-app'));

  let pathOk = canAccessPath(location.pathname);
  if (isColaboradorSimples(user)) {
    const allowedOperacional = [
      '/app',
      '/app/proacao',
      '/app/cadastrar-com-ia',
      '/app/biblioteca',
      '/app/registro-inteligente',
      '/app/chatbot',
      '/chat',
      '/app/settings',
      '/app/admin/system-health'
    ];
    pathOk =
      allowedOperacional.includes(normalizedPath) || normalizedPath.startsWith('/app/proacao/');
  } else if (maintenanceTechnicianMenu) {
    const allowMaint = [
      '/app',
      '/app/proacao',
      '/app/cadastrar-com-ia',
      '/app/registro-inteligente',
      '/app/chatbot',
      '/chat',
      '/diagnostic',
      '/app/manutencao/manuia',
      '/app/manutencao/manuia-app',
      '/app/biblioteca',
      '/app/settings',
      '/app/admin/system-health'
    ];
    pathOk = allowMaint.includes(normalizedPath) || normalizedPath.startsWith('/app/proacao/');
  }

  if (!modulesLoading && !allowManuiaByMaintenance && !pathOk) {
    if ((user.role || '').toLowerCase() === 'admin') return <Navigate to="/app/admin/implantacao-guia" replace state={{ from: location }} />;
    if (isColaboradorSimples(user)) return <Navigate to="/app" replace state={{ from: location }} />;
    return <Navigate to="/app" replace state={{ from: location }} />;
  }
  if (!modulesLoading && location.pathname === '/app' && isStrictAdminRole(user)) return <Navigate to="/app/admin/implantacao-guia" replace />;

  /** Industrial / operacional — filtrado por visible_modules (operational) */
  const MENU_BLOCO_INDUSTRIAL = [
    { path: '/app/centro-operacoes-industrial', icon: Building2, label: 'Centro de Operações' },
    { path: '/app/cerebro-operacional', icon: Brain, label: 'Cérebro operacional' },
    { path: '/app/insights', icon: TrendingUp, label: 'Insights operacionais' }
  ];

  /** Liderança — núcleo industrial liberado apenas para CEO/Diretor industrial-operações. */
  const MENU_LIDERANCA = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard · IA integrada' },
    { path: '/app/pulse-gestao', icon: Activity, label: 'Impetus Pulse (visão coletiva)' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/app/validacao-organizacional', icon: Shield, label: 'Validação organizacional' },
    { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
    { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
    { path: '/app/admin/system-health', icon: Activity, label: 'Saúde do Sistema' },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];

  /** Colaborador operacional (sem manutenção): dashboard + turno — não confundir com técnico de manutenção */
  const MENU_COLABORADOR_OPERACIONAL = [
    { path: '/app', icon: LayoutDashboard, label: 'Meu Dashboard' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
    { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];

  /** Mecânico / eletricista / eletromecânico — dashboard técnico + ferramentas de campo */
  const MENU_MANUTENCAO_TECNICO = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/manutencao/manuia-app', icon: Smartphone, label: 'ManuIA Campo' },
    { path: '/app/manutencao/manuia', icon: Wrench, label: 'ManuIA' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/diagnostic', icon: ClipboardList, label: 'Diagnóstico / OS' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Manuais e Biblioteca' },
    { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
    { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];
  const MENU_MANUTENCAO_MODULOS = [
    { path: '/app/manutencao/manuia-app', icon: Smartphone, label: 'ManuIA Campo' },
    { path: '/app/manutencao/manuia', icon: Wrench, label: 'ManuIA' }
  ];

  const MENUS = {
    admin: [
      { path: '/app/admin/implantacao-guia', icon: ClipboardList, label: 'Guia de Implantação' },
      { path: '/app/admin/users', icon: Users, label: 'Gestão de Usuários' },
      { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
      { path: '/app/admin/centro-custos', icon: DollarSign, label: 'Centro de Custos (Config)' },
      { path: '/app/admin/departments', icon: Building2, label: 'Departamentos' },
      { path: '/app/admin/equipes-operacionais', icon: UsersRound, label: 'Equipes operacionais' },
      { path: '/app/admin/structural', icon: Layers, label: 'Base Estrutural' },
      { path: '/app/admin/conteudo-empresa', icon: ScrollText, label: 'Conteúdo da empresa' },
      { path: '/app/admin/equipment-library', icon: Package, label: 'Biblioteca técnica' },
      { path: '/app/biblioteca', icon: FolderOpen, label: 'Biblioteca de Arquivos' },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Interno' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/app/admin/audit-logs', icon: FileText, label: 'Logs de Auditoria' },
      { path: '/app/admin/ai-incidents', icon: AlertTriangle, label: 'Incidentes de IA' },
      { path: '/app/admin/integrations', icon: Zap, label: 'Integração e Conectividade' },
      { path: '/app/admin/system-health', icon: Activity, label: 'Saúde do Sistema' },
      { path: '/app/admin/nexusia-custos', icon: Cpu, label: 'Nexus IA — Custos e carteira' },
      { path: '/app/admin/help-center', icon: HelpCircle, label: 'Central de Ajuda do Admin' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ],
    diretor: MENU_LIDERANCA,
    gerente: MENU_LIDERANCA,
    coordenador: MENU_LIDERANCA,
    supervisor: MENU_LIDERANCA,
    operador: [
      { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
      { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
      { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ],
    colaborador: MENU_COLABORADOR_OPERACIONAL,
    rh: [
      { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/app/pulse-rh', icon: Activity, label: 'Impetus Pulse (RH)' },
      { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ],
    // Núcleo industrial (Centro de Operações, Cérebro, Insights) entra só via canAccessIndustrialCoreModules
    // abaixo — evita duplicar com o mesmo bloco no array estático.
    ceo: [
      { path: '/app', icon: LayoutDashboard, label: 'Dashboard · IA integrada' },
      { path: '/app/centro-previsao-operacional', icon: TrendingUp, label: 'Centro de Previsão' },
      { path: '/app/centro-custos-industriais', icon: DollarSign, label: 'Centro de Custos' },
      { path: '/app/mapa-vazamento-financeiro', icon: TrendingDown, label: 'Mapa de Vazamento' },
      { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
      { path: '/app/biblioteca', icon: FolderOpen, label: 'Biblioteca' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/validacao-organizacional', icon: Shield, label: 'Validação organizacional' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Interno' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ]
  };

  let baseMenuItems;
  if (maintenanceTechnicianMenu) {
    baseMenuItems = MENU_MANUTENCAO_TECNICO;
  } else {
    baseMenuItems = MENUS[role] || MENU_COLABORADOR_OPERACIONAL;
  }

  /** RH explícito, perfil hr_management ou liderança com setor/cargo de RH (dashboard_profile por vezes não vem no token). */
  if (
    shouldOfferPulseRhMenu(user) &&
    !baseMenuItems.some((item) => item.path === '/app/pulse-rh')
  ) {
    const cloned = [...baseMenuItems];
    const dashboardIdx = cloned.findIndex((item) => item.path === '/app');
    const insertAt = dashboardIdx >= 0 ? dashboardIdx + 1 : 0;
    cloned.splice(insertAt, 0, {
      path: '/app/pulse-rh',
      icon: Activity,
      label: 'Impetus Pulse (RH)'
    });
    baseMenuItems = cloned;
  }

  // Regra: manutenção (supervisor e técnicos do depto de manutenção) sempre vê ManuIA e ManuIA Campo.
  if (maintenanceProfile && !maintenanceTechnicianMenu) {
    const cloned = [...baseMenuItems];
    const dashboardIdx = cloned.findIndex((item) => item.path === '/app');
    const insertAt = dashboardIdx >= 0 ? dashboardIdx + 1 : 0;
    const alreadyHasManuia = cloned.some((item) => item.path === '/app/manutencao/manuia');
    if (!alreadyHasManuia) cloned.splice(insertAt, 0, ...MENU_MANUTENCAO_MODULOS);
    baseMenuItems = cloned;
  }

  // CEO, diretor industrial/operações: bloco industrial uma vez, logo após o Dashboard.
  if (canAccessIndustrialCoreModules) {
    const cloned = [...baseMenuItems];
    const existing = new Set(cloned.map((item) => (item.path || '').replace(/\/+$/, '') || '/'));
    const missingIndustrial = MENU_BLOCO_INDUSTRIAL.filter((item) => {
      const p = (item.path || '').replace(/\/+$/, '') || '/';
      return !existing.has(p);
    });
    if (missingIndustrial.length > 0) {
      const dashboardIdx = cloned.findIndex((item) => item.path === '/app');
      const insertAt = dashboardIdx >= 0 ? dashboardIdx + 1 : 0;
      cloned.splice(insertAt, 0, ...missingIndustrial);
      baseMenuItems = cloned;
    }
  }

  let menuItems = filterMenu(baseMenuItems);
  menuItems = menuItems.filter((item) => {
    const p = (item.path || '').replace(/\/+$/, '') || '/';
    if (!INDUSTRIAL_CORE_PATHS.has(p)) return true;
    return canAccessIndustrialCoreModules;
  });
  menuItems = dedupeMenuItemsByPath(menuItems);

  if (!isStrictAdminRole(user)) {
    menuItems = menuItems.filter(
      (item) => (item.path || '').replace(/\/+$/, '') !== '/app/admin/implantacao-guia'
    );
  }

  const SYSTEM_HEALTH_PATH = '/app/admin/system-health';
  /** Qualquer sessão /app com JWT: injeta entrada no menu lateral se faltar. */
  const hasAppSession =
    typeof window !== 'undefined' && !!localStorage.getItem('impetus_token');
  if (hasAppSession) {
    const hasHealth = menuItems.some(
      (item) => (item.path || '').replace(/\/+$/, '') === SYSTEM_HEALTH_PATH
    );
    if (!hasHealth) {
      const entry = { path: SYSTEM_HEALTH_PATH, icon: Activity, label: 'Saúde do Sistema' };
      const settingsIdx = menuItems.findIndex(
        (item) => (item.path || '').replace(/\/+$/, '') === '/app/settings'
      );
      if (settingsIdx >= 0) menuItems.splice(settingsIdx, 0, entry);
      else menuItems.push(entry);
    }
  }

  const healthPresentInSidebar = menuItems.some(
    (item) => item.path && (item.path || '').replace(/\/+$/, '') === SYSTEM_HEALTH_PATH
  );
  const showPinnedSystemHealthNav =
    !isUserSettingsFocus && hasAppSession && !healthPresentInSidebar;

  if (isUserSettingsFocus) {
    menuItems = [
      { path: '/app', icon: ChevronLeft, label: 'Voltar ao painel', settingsBack: true },
      ...USER_SETTINGS_FOCUS_NAV.map((item) => ({ ...item, settingsAnchor: true }))
    ];
  }

  const scrollToSettingsSection = (hash) => {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${hash}`);
      setSettingsNavHash(hash);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch (_) {
      /* sessão já pode estar inválida */
    }
    localStorage.removeItem('impetus_token');
    localStorage.removeItem('impetus_user');
    try {
      sessionStorage.removeItem('impetus_factory_operator_gate');
    } catch (_) {}
    navigate('/');
  };

  const getFormattedDate = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    
    return `${dayName}, ${day} de ${month}`;
  };

  const dismissWakeHttpBanner = () => {
    try {
      sessionStorage.setItem('impetus_wake_http_dismiss', '1');
    } catch (_) {}
    setWakeHttpBannerDismissed(true);
  };

  return (
    <div className={`layout${showWakeHttpBanner ? ' layout--wake-hint' : ''}`}>
      {isNarrowViewport && sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {showWakeHttpBanner && (
        <div className="layout-wake-banner" role="status">
          <Mic size={16} aria-hidden />
          <span>
            Comando «Ok Impetus» não está disponível neste endereço (HTTP). Use{' '}
            <strong>HTTPS</strong>, ou abra a IA pelo vídeo no menu, pelo botão de microfone ao lado, ou{' '}
            <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>.
          </span>
          <button type="button" className="layout-wake-banner__close" onClick={dismissWakeHttpBanner} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}
      <FactoryTeamOperatorBar />
      {/* Sidebar - Redesign IMPETUS */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="logo-area">
          {sidebarOpen ? (
            <>
              <button
                type="button"
                className="logo-ia-trigger"
                onClick={openOverlay}
                title="Abrir Impetus IA"
                aria-label="Abrir Impetus IA"
              >
                <video
                  className="logo-ia-face logo-ia-face--large"
                  src={iaVideoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="logo-ia-trigger"
              onClick={openOverlay}
              title="Abrir Impetus IA"
              aria-label="Abrir Impetus IA"
            >
              <video
                className="logo-ia-face logo-ia-face--mini"
                src={iaVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
            if (item.settingsBack) {
              const Icon = item.icon;
              return (
                <Link
                  key="settings-back"
                  to={item.path}
                  className="nav-item nav-item--settings-back"
                  title={item.label}
                  onClick={closeSidebarAfterNav}
                >
                  <span className="nav-dot" />
                  <Icon size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            }
            if (item.settingsAnchor) {
              const Icon = item.icon;
              const isActive = settingsNavHash === item.hash;
              return (
                <a
                  key={item.hash}
                  href={`#${item.hash}`}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSettingsSection(item.hash);
                    closeSidebarAfterNav();
                  }}
                >
                  <span className="nav-dot" />
                  <Icon size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                </a>
              );
            }
            const Icon = item.icon;
            const itemNorm = item.path.replace(/\/+$/, '') || '/';
            const isActive = pathNorm === itemNorm;
            const systemHealthLink = itemNorm === '/app/admin/system-health';
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item${systemHealthLink ? ' nav-item--system-health' : ''}${isActive ? ' active' : ''}`}
                title={item.label}
                onMouseEnter={() => prefetchRoute(item.path)}
                onClick={closeSidebarAfterNav}
              >
                <span className="nav-dot" />
                {item.aiIcon
                  ? (
                    <video
                      className="nav-item-ia-icon"
                      src={iaVideoSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                    />
                  )
                  : item.chatIcon
                  ? <img src={chatSidebarIcon} alt="Chat" className="nav-item-chat-icon" />
                  : Icon
                  ? <Icon size={18} />
                  : null}
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
          {showPinnedSystemHealthNav && (
            <Link
              key="system-health-pinned"
              to={SYSTEM_HEALTH_PATH}
              className={`nav-item nav-item--system-health${pathNormRoot === SYSTEM_HEALTH_PATH ? ' active' : ''}`}
              title="Saúde do Sistema"
              onMouseEnter={() => prefetchRoute(SYSTEM_HEALTH_PATH)}
              onClick={closeSidebarAfterNav}
            >
              <span className="nav-dot" />
              <Activity size={18} aria-hidden />
              {sidebarOpen && <span>Saúde do Sistema</span>}
            </Link>
          )}
        </nav>

        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar - Redesign IMPETUS */}
        <header className="topbar header">
          <button
            type="button"
            className="topbar-nav-toggle"
            aria-label={sidebarOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="header-left">
            <div className="welcome greeting">
              Bem-vindo, <span>{user.name}</span>
            </div>
            <p className="datetime date-time" title="Data e hora atual">
              {getFormattedDate()} {currentTime}
            </p>
          </div>

          <div className="topbar-brand-center" aria-hidden="true">
            <span className="topbar-brand-center__text">IMPETUS</span>
            <span className="topbar-brand-center__sub">Plataforma de Inteligência Operacional Industrial</span>
          </div>

          <div className="header-right" ref={headerDropdownRef}>
            {!isUserSettingsFocus && hasAppSession && (
              <Link
                to={SYSTEM_HEALTH_PATH}
                className={`topbar-health-link${pathNormRoot === SYSTEM_HEALTH_PATH ? ' topbar-health-link--active' : ''}`}
                title="Saúde do Sistema"
                onClick={() => {
                  prefetchRoute(SYSTEM_HEALTH_PATH);
                  closeSidebarAfterNav();
                }}
              >
                <Activity size={16} aria-hidden />
                <span>Saúde do Sistema</span>
              </Link>
            )}
            <div className="sys-status" title="Status do sistema">
              <span className="pulse" />
              SISTEMA ATIVO
            </div>
            {voiceUiEnabled && (
              <button
                type="button"
                className="icon-btn header-icon-btn header-icon-btn--mic"
                title="IA operacional ao vivo — Alt+Shift+V"
                aria-label="Abrir IA operacional ao vivo"
                onClick={() => void openOverlay()}
              >
                <Mic size={20} />
              </button>
            )}
            <div className="header-dropdown-wrapper">
              <button
                className={`icon-btn header-icon-btn ${showNotifications ? 'active' : ''} ${notificationCount > 0 ? 'has-alert' : ''}`}
                title="Notificações"
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowHelp(false); }}
                aria-expanded={showNotifications}
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </button>
              {showNotifications && (
                <div className="header-dropdown">
                  <h4 className="header-dropdown__title">Notificações</h4>
                  <div className="header-dropdown__empty">
                    <Mail size={32} />
                    <p>Nenhuma notificação nova</p>
                    <span className="header-dropdown__hint">Alertas e comunicados aparecerão aqui</span>
                  </div>
                </div>
              )}
            </div>

            <div className="header-dropdown-wrapper">
              <button
                className={`icon-btn header-icon-btn ${showProfile ? 'active' : ''}`}
                title="Perfil"
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowHelp(false); }}
                aria-expanded={showProfile}
              >
                <User size={20} />
              </button>
              {showProfile && (
                <div className="header-dropdown">
                  <h4 className="header-dropdown__title">Meu perfil</h4>
                  <div className="header-dropdown__profile">
                    <div className="header-dropdown__profile-avatar">
                      <User size={24} />
                    </div>
                    <div className="header-dropdown__profile-info">
                      <strong>{user.name}</strong>
                      <span>{user.email || '—'}</span>
                      <span className="header-dropdown__role">{user.role || user.area || 'Usuário'}</span>
                    </div>
                  </div>
                  <Link
                    to="/app/settings"
                    className="header-dropdown__link"
                    onClick={() => setShowProfile(false)}
                  >
                    <Settings size={16} /> Configurações
                  </Link>
                </div>
              )}
            </div>

            <div className="header-dropdown-wrapper">
              <button
                className={`icon-btn header-icon-btn ${showHelp ? 'active' : ''}`}
                title="Ajuda"
                onClick={() => { setShowHelp(!showHelp); setShowNotifications(false); setShowProfile(false); }}
                aria-expanded={showHelp}
              >
                <HelpCircle size={20} />
              </button>
              {showHelp && (
                <div className="header-dropdown">
                  <h4 className="header-dropdown__title">Ajuda e suporte</h4>
                  <Link
                    to="/app/chatbot"
                    className="header-dropdown__link"
                    onClick={() => setShowHelp(false)}
                  >
                    <MessageSquare size={16} /> Chat com Impetus
                  </Link>
                  <a
                    href="mailto:suporte@impetus.com.br"
                    className="header-dropdown__link"
                    onClick={() => setShowHelp(false)}
                  >
                    <Mail size={16} /> Contato por e-mail
                  </a>
                  <Link
                    to="/app/admin/help-center"
                    className="header-dropdown__link"
                    onClick={() => setShowHelp(false)}
                  >
                    <ExternalLink size={16} /> Documentação
                  </Link>
                </div>
              )}
            </div>

            <button 
              className="icon-btn header-icon-btn"
              title="Sair"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {subscriptionOverdue && (
          <div className="subscription-overdue-banner">
            <AlertTriangle size={20} />
            <span>Assinatura em atraso. Regularize o pagamento para manter o acesso.</span>
            <Link to="/subscription-expired" className="subscription-overdue-banner__link">Ver detalhes</Link>
          </div>
        )}

        {pulseUi.motivation && (
          <div className="impetus-pulse-motivation-banner" role="status">
            <Activity size={18} aria-hidden />
            <span>{pulseUi.motivation}</span>
            <button type="button" className="impetus-pulse-motivation-banner__close" onClick={pulseUi.dismissMotivation} aria-label="Fechar">
              ×
            </button>
          </div>
        )}

        {pulseSup.pending?.length > 0 && (
          <div className="impetus-pulse-sup-banner">
            <strong>Impetus Pulse:</strong> {pulseSup.pending.length} complemento(s) de percepção pendente(s).{' '}
            <button type="button" className="link-button" onClick={() => setPulseSupItem(pulseSup.pending[0])}>
              Preencher agora
            </button>
          </div>
        )}

        {/* Content */}
        <main className="content">
          {children}
        </main>
      </div>

      <ImpetusPulseModal
        isOpen={pulseUi.promptOpen}
        evaluation={pulseUi.evaluation}
        onClose={pulseUi.closePrompt}
        onSubmitted={pulseUi.onSubmitted}
      />
      <ImpetusPulseSupervisorModal
        isOpen={!!pulseSupItem}
        item={pulseSupItem}
        onClose={() => setPulseSupItem(null)}
        onDone={() => pulseSup.refresh()}
      />
    </div>
  );
}
