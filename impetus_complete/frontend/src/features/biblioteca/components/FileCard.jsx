import React from 'react';
import { FileText, Image, Film, BookOpen, Shield } from 'lucide-react';
import Card from '../../../components/ui/Card';
import './FileCard.css';

const ICONS = {
  default: FileText,
  politica: Shield,
  pop: FileText,
  manual: BookOpen,
  maquina: BookOpen,
  imagens: Image,
  videos: Film,
};

export default function FileCard({ file, onSelect, isActive }) {
  const Icon = ICONS[file.tipo] || ICONS.default;

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card
      hoverable
      active={isActive}
      onClick={() => onSelect?.(file)}
      padding="md"
      className="file-card"
    >
      <div className="file-card__preview">
        <Icon size={40} className="file-card__icon" />
        {file.thumbnail && (
          <img src={file.thumbnail} alt="" className="file-card__thumb" />
        )}
      </div>

      <div className="file-card__body">
        <h4 className="file-card__titulo" title={file.titulo}>
          {file.titulo || 'Sem título'}
        </h4>

        <p className="file-card__meta">
          {formatDate(file.updated_at)}
        </p>

        {file.descricao && (
          <p className="file-card__desc">
            {file.descricao.length > 60
              ? `${file.descricao.slice(0, 60)}...`
              : file.descricao}
          </p>
        )}
      </div>
    </Card>
  );
}