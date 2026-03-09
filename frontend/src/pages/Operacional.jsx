/**
 * INTERFACE OPERACIONAL - FASE 4
 * Visão focada para o chão de fábrica
 * Acesso rápido às principais operações do dia
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Lightbulb, Wrench, MapPin, ChevronRight, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import './Operacional.css';

const OPERACIONAL_CARDS = [
  { path: '/app/chatbot', icon: MessageSquare, title: 'Comunicações', description: 'Chatbot e mensagens operacionais', color: 'blue' },
  { path: '/proposals', icon: Lightbulb, title: 'Pró-Ação', description: 'Propostas de melhoria contínua', color: 'teal' },
  { path: '/diagnostic', icon: Wrench, title: 'Diagnóstico', description: 'Manutenção assistida por IA', color: 'orange' },
  { path: '/app/monitored-points', icon: MapPin, title: 'Pontos Monitorados', description: 'Monitoramento de equipamentos', color: 'purple' }
];

export default function Operacional() {
  return (
    <Layout>
      <div className="operacional-container">
        <div className="operacional-header">
          <div className="operacional-title-group">
            <Zap size={28} className="operacional-icon" />
            <div>
              <h1 className="operacional-title">Interface Operacional</h1>
              <p className="operacional-subtitle">Acesso rápido às operações do dia</p>
            </div>
          </div>
        </div>
        <div className="operacional-cards">
          {OPERACIONAL_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.path} to={card.path} className={`operacional-card operacional-card--${card.color}`}>
                <div className="operacional-card-icon"><Icon size={32} /></div>
                <div className="operacional-card-content">
                  <h3 className="operacional-card-title">{card.title}</h3>
                  <p className="operacional-card-desc">{card.description}</p>
                </div>
                <ChevronRight size={24} className="operacional-card-arrow" />
              </Link>
            );
          })}
        </div>
        <div className="operacional-footer">
          <p>Use o menu lateral para acessar o Dashboard completo, Gestão de Usuários e Configurações.</p>
        </div>
      </div>
    </Layout>
  );
}
