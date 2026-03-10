/**
 * Modal de Resumo Inteligente Diário/Semanal
 * Exibido no primeiro login do dia
 */
import React from 'react';
import Modal from '../../components/Modal';
import './SmartSummaryModal.css';

export default function SmartSummaryModal({ isOpen, onClose, summary, periodo, loading }) {
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const isWeekly = periodo === 'semanal';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isWeekly
          ? `📊 Resumo Semanal – ${hoje}`
          : `☀️ Resumo Inteligente – ${hoje}`
      }
      size="large"
      showCloseButton={true}
      closeOnOverlayClick={true}
    >
      <div className="smart-summary-modal">
        {loading ? (
          <div className="smart-summary-loading">
            <div className="smart-summary-spinner" />
            <p>Gerando seu resumo personalizado...</p>
          </div>
        ) : summary ? (
          <div
            className="smart-summary-content"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(summary) }}
          />
        ) : (
          <p className="smart-summary-empty">Nenhum resumo disponível.</p>
        )}
      </div>
    </Modal>
  );
}

function markdownToHtml(md) {
  if (!md) return '';
  return md
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n### (.+)/g, '<h4>$1</h4>')
    .replace(/\n## (.+)/g, '<h3>$1</h3>')
    .replace(/\n# (.+)/g, '<h3>$1</h3>')
    .replace(/\n- (.+)/g, '<li>$1</li>')
    .replace(/\n\d+\. (.+)/g, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/(<li>.*<\/li>)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^(.+)$/gm, (m) => (m.startsWith('<') ? m : `<p>${m}</p>`))
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[34]>)/g, '$1')
    .replace(/(<\/h[34]>)<\/p>/g, '$1');
}
