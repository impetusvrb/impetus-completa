/**
 * LAYOUT PRINCIPAL
 * Sidebar + Header + Conteúdo
 */

import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { companies } from '../services/api';
import './Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationCount, setNotificationCount] = useState(2);
  const [subscriptionOverdue, setSubscriptionOverdue] = useState(false);

  useEffect(() => {
    companies.getMe().then((r) => {
      if (r?.data?.company?.subscription_status === 'overdue') {
        setSubscriptionOverdue(true);
      }
    }).catch(() => {});
  }, []);
  
  // Pegar dados do usuário do localStorage
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Usuário', role: 'colaborador' };

  const isColaborador = user.role === 'colaborador';
  const isCEO = user.role === 'ceo';
  const allMenuItems = isCEO
    ? [
        { path: '/app', icon: LayoutDashboard, label: 'Visão Executiva' }
      ]
    : [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/operacional', icon: Zap, label: 'Operacional' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Biblioteca de Arquivos' },
    { path: '/app/chatbot', icon: MessageSquare, label: 'Chatbot Interacionais' },
    { path: '/app/insights', icon: Brain, label: 'IA Insights' },
    { path: '/app/monitored-points', icon: MapPin, label: 'Pontos Monitorados' },
    { path: '/app/admin/users', icon: Users, label: 'Gestão de Usuários' },
    { path: '/app/admin/departments', icon: Building2, label: 'Departamentos' },
    { path: '/app/admin/audit-logs', icon: FileText, label: 'Logs de Auditoria' },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];
  const menuItems = isCEO
    ? allMenuItems
    : isColaborador
    ? [{ path: '/app/proacao', icon: Target, label: 'Pró-Ação' }]
    : allMenuItems;

  const handleLogout = () => {
    localStorage.removeItem('impetus_token');
    localStorage.removeItem('impetus_user');
    navigate('/');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Manhã';
    if (hour < 18) return 'Tarde';
    return 'Noite';
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
            <p className="date-time">
              {getFormattedDate()} | {getGreeting()}
            </p>
          </div>

          <div className="header-right">
            <button className="header-icon-btn" title="Notificações">
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </button>

            <button className="header-icon-btn" title="Perfil">
              <User size={20} />
            </button>

            <button className="header-icon-btn" title="Ajuda">
              <HelpCircle size={20} />
            </button>

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
    </div>
  );
}
