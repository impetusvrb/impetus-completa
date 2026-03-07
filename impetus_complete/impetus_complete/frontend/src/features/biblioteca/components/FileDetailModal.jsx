import React from 'react';
import { Download, ExternalLink, Calendar, Tag } from 'lucide-react';
import Modal from '../../../components/Modal';
import './FileDetailModal.css';

export default function FileDetailModal({ arquivo, isOpen, onClose }) {
  if (!arquivo) return null;

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('pt-BR');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={arquivo.titulo || 'Detalhes do arquivo'}
      size="large"
    >
      <div className="file-detail-modal">
        <div className="file-detail-modal__preview">
          {arquivo.url ? (
            <a href={arquivo.url} target="_blank" rel="noopener noreferrer" className="file-detail-modal__link">
              Abrir arquivo <ExternalLink size={16} />
            </a>
          ) : (
            <p className="file-detail-modal__placeholder">Pré-visualização não disponível</p>
          )}
        </div>
        <div className="file-detail-modal__info">
          <div className="file-detail-modal__row">
            <Calendar size={18} />
            <span>Atualizado em {formatDate(arquivo.updated_at)}</span>
          </div>
          {arquivo.tipo && (
            <div className="file-detail-modal__row">
              <Tag size={18} />
              <span>{arquivo.tipo}</span>
            </div>
          )}
          {arquivo.descricao && (
            <div className="file-detail-modal__desc">
              <h4>Descrição</h4>
              <p>{arquivo.descricao}</p>
            </div>
          )}
          <div className="file-detail-modal__actions">
            {arquivo.url && (
              <a
                href={arquivo.url}
                download
                className="btn btn-primary"
              >
                <Download size={18} />
                Baixar
              </a>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
