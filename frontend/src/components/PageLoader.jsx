/**
 * Loader usado durante lazy loading de rotas
 * Feedback visual para Indústria 4.0 — usuário sabe que o sistema está respondendo
 */
import React from 'react';
import './PageLoader.css';

export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Carregando">
      <div className="page-loader__spinner" />
      <p className="page-loader__text">Carregando...</p>
    </div>
  );
}
