import React from 'react';
import FileCard from './FileCard';
import './FileGrid.css';

export default function FileGrid({ files, arquivoSelecionado, onSelectArquivo, loading }) {
  if (loading) {
    return (
      <div className="file-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="file-grid__skeleton" />
        ))}
      </div>
    );
  }

  if (!files?.length) {
    return (
      <div className="file-grid__empty">
        <p>Nenhum arquivo encontrado</p>
      </div>
    );
  }

  return (
    <div className="file-grid">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onSelect={onSelectArquivo}
          isActive={arquivoSelecionado?.id === file.id}
        />
      ))}
    </div>
  );
}
