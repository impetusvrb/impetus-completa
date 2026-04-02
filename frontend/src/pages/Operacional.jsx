/**
 * PAINEL DO AUXILIAR DE PRODUÇÃO
 * Interface focada nas atividades do chão de fábrica
 * Acesso rápido: Pró-Ação, instruções, registro e suporte
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, FolderOpen, FileEdit, Wrench, MessageSquare, ChevronRight, ClipboardList } from 'lucide-react';
import Layout from '../components/Layout';
import './Operacional.css';

const OPERACIONAL_CARDS = [
  { path: '/app/proacao', icon: Lightbulb, title: 'Pró-Ação', description: 'Envie propostas de melhoria e acompanhe as suas sugestões', color: 'teal' },
  { path: '/app/biblioteca', icon: FolderOpen, title: 'Instruções e Procedimentos', description: 'Manuais, POPs e procedimentos operacionais', color: 'blue' },
  { path: '/app/registro-inteligente', icon: FileEdit, title: 'Registro de Atividades', description: 'Registre suas atividades e ocorrências do turno', color: 'purple' },
  { path: '/diagnostic', icon: Wrench, title: 'Reportar Problema', description: 'Assistência da IA para diagnosticar falhas e equipamentos', color: 'orange' },
  { path: '/app/chatbot', icon: MessageSquare, title: 'Impetus IA', description: 'Tire dúvidas e consulte informações com a IA', color: 'green' }
];

export default function Operacional() {
  return (
    <Layout>
      <div className="operacional-container">
        <div className="operacional-header">
          <div className="operacional-title-group">
            <ClipboardList size={28} className="operacional-icon" />
            <div>
              <h1 className="operacional-title">Painel do Auxiliar de Produção</h1>
              <p className="operacional-subtitle">Suas atividades, instruções e ferramentas do dia</p>
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
          <p>Use o menu lateral para acessar Pró-Ação, Instruções, Registro de Atividades e a IA Impetus.</p>
        </div>
      </div>
    </Layout>
  );
}
