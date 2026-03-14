import React from 'react';
import { 
  FileText, 
  FolderOpen, 
  Image, 
  Film, 
  BookOpen, 
  Shield,
  Settings
} from 'lucide-react';
import './CategoriaSidebar.css';

const CATEGORIAS = [
  { id: 'todos', label: 'Todos', icon: FolderOpen },
  { id: 'politica', label: 'Políticas', icon: Shield },
  { id: 'pop', label: 'POPs', icon: FileText },
  { id: 'manual', label: 'Manuais Operacionais', icon: BookOpen },
  { id: 'maquina', label: 'Manuais de Máquinas', icon: Settings },
  { id: 'imagens', label: 'Imagens', icon: Image },
  { id: 'videos', label: 'Vídeos', icon: Film },
];

export default function CategoriaSidebar({ ativa, onSelect }) {
  return (
    <aside className="categoria-sidebar">
      <h3 className="categoria-sidebar__titulo">Categorias</h3>
      <nav className="categoria-sidebar__nav">
        {CATEGORIAS.map((cat) => {
          const Icon = cat.icon;
          const isActive = ativa === cat.id;
          return (
            <button
              key={cat.id}
              className={`categoria-sidebar__item ${isActive ? 'categoria-sidebar__item--active' : ''}`}
              onClick={() => onSelect?.(cat.id)}
            >
              <Icon size={20} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
