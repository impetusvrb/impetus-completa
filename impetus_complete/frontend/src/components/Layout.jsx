/**
 * LAYOUT PRINCIPAL
 * Sidebar + Header + Conteúdo
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap,
  MessageSquare, 
  Brain, 
  MapPin, 
  Settings,
  Bell,
  User,
  Users,
  Building2,
  FileText,
  FolderOpen,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Target,
  AlertTriangle,
  Mail,
  ExternalLink
} from 'lucide-react';
import { companies, onboarding, userIdentification } from '../services/api';
import OnboardingModal from './OnboardingModal';
import IdentificationModal from './IdentificationModal';
import './Layout.css';

export default function Layout({ children }) {
  const [onboardingState, setOnboardingState] = useState({ show: false, tipo: null });
  const [identificationStatus, setIdentificationStatus] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

  useEffect(() => {
    companies.getMe().then((r) => {
      if (r?.data?.company?.subscription_status === 'overdue') {
        setSubscriptionOverdue(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    onboarding.getStatus().then((r) => {
      if (r?.data?.needsOnboarding && r?.data?.activeType) {
        setOnboardingState({ show: true, tipo: r.data.activeType });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    userIdentification.getStatus().then((r) => {
      const s = r?.data;
      if (s?.status === 'needs_activation' || s?.status === 'needs_daily_verify') {
        setIdentificationStatus(s);
      }
    }).catch(() => {});
  }, []);
  
  // Pegar dados do usuário do localStorage
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Usuário', role: 'colaborador' };

  const isColaborador = user.role === 'colaborador';
  const isCEO = user.role === 'ceo';
  const isAdministrador = (user.hierarchy_level ?? 5) <= 1; // CEO (0) ou Diretor (1)
  const baseMenuItems = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/chat', icon: Mail, label: 'Chat' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/operacional', icon: Zap, label: 'Operacional' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Biblioteca de Arquivos' },
    { path: '/app/chatbot', icon: MessageSquare, label: 'Chatbot Interacionais' },
    { path: '/app/insights', icon: Brain, label: 'IA Insights' },
    { path: '/app/monitored-points', icon: MapPin, label: 'Pontos Monitorados' }
  ];
  const adminMenuItems = [
    { path: '/app/admin/users', icon: Users, label: 'Gestão de Usuários' },
    { path: '/app/admin/departments', icon: Building2, label: 'Departamentos' },
    { path: '/app/admin/audit-logs', icon: FileText, label: 'Logs de Auditoria' },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];
  const allMenuItems = isCEO
    ? [
        { path: '/app', icon: LayoutDashboard, label: 'Visão Executiva' }
      ]
    : [
        ...baseMenuItems,
        ...(isAdministrador ? adminMenuItems : [])
      ];
  const menuItems = isCEO
    ? allMenuItems
    : isColaborador
    ? [{ path: '/chat', icon: Mail, label: 'Chat' }, { path: '/app/proacao', icon: Target, label: 'Pró-Ação' }]
    : allMenuItems;

  const handleLogout = () => {
    localStorage.removeItem('impetus_token');
    localStorage.removeItem('impetus_user');
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

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className={`logo ${sidebarOpen ? 'logo-open' : 'logo-closed'}`}>
            <img
              src="/logo-impetus.jpg"
              alt="Impetus"
              className="sidebar-logo-img"
            />
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={item.label}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
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
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h2 className="greeting">
              Bem-vindo, <strong>{user.name}</strong>
            </h2>
            <p className="date-time" title="Data e hora atual">
              {getFormattedDate()} | {currentTime}
            </p>
          </div>

          <div className="header-right" ref={headerDropdownRef}>
            <div className="header-dropdown-wrapper">
              <button
                className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
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
                className={`header-icon-btn ${showProfile ? 'active' : ''}`}
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
                className={`header-icon-btn ${showHelp ? 'active' : ''}`}
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
                  <a
                    href="#"
                    className="header-dropdown__link"
                    onClick={(e) => { e.preventDefault(); setShowHelp(false); }}
                  >
                    <ExternalLink size={16} /> Documentação
                  </a>
                </div>
              )}
            </div>

            <button 
              className="header-icon-btn" 
              title="Sair"
              onClick={handleLogout}
            >
              <LogOut size={20} />
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

        {/* Content */}
        <main className="content">
          {children}
        </main>
      </div>

      {identificationStatus ? (
        <IdentificationModal
          status={identificationStatus}
          onComplete={() => setIdentificationStatus(null)}
        />
      ) : onboardingState.show && onboardingState.tipo ? (
        <OnboardingModal
          tipo={onboardingState.tipo}
          onComplete={() => setOnboardingState({ show: false, tipo: null })}
        />
      ) : null}
    </div>
  );
}
