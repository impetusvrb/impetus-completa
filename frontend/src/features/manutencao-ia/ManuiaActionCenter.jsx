/**
 * UX-MANUIA-001/002 — Centro de Ação (mobile-first)
 * Entrada única para as quatro ações principais.
 */
import React, { useState } from 'react';
import { Search, Video, Upload, QrCode, X } from 'lucide-react';

export default function ManuiaActionCenter({
  activeMode = null,
  onSearch,
  onLiveAssistance,
  onUploadImage,
  onQrCodeSubmit
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState('');

  const handleQr = (e) => {
    e.preventDefault();
    const v = qrValue.trim();
    if (v.length < 2) return;
    onQrCodeSubmit?.(v);
    setQrOpen(false);
    setQrValue('');
  };

  return (
    <section className="manuia-action-center" aria-label="Centro de ação ManuIA">
      <div className="manuia-action-center__grid">
        <button
          type="button"
          className={`manuia-action-tile manuia-action-tile--primary${activeMode === 'search' ? ' manuia-action-tile--active' : ''}`}
          onClick={onSearch}
        >
          <Search size={20} strokeWidth={1.75} />
          <span className="manuia-action-tile__title">Pesquisa</span>
          <span className="manuia-action-tile__hint">Texto ou voz</span>
        </button>
        <button
          type="button"
          className={`manuia-action-tile manuia-action-tile--live${activeMode === 'vision3d' ? ' manuia-action-tile--active' : ''}`}
          onClick={onLiveAssistance}
        >
          <Video size={20} strokeWidth={1.75} />
          <span className="manuia-action-tile__title">Ao vivo</span>
          <span className="manuia-action-tile__hint">Câmera + IA</span>
        </button>
        <button type="button" className="manuia-action-tile" onClick={onUploadImage}>
          <Upload size={20} strokeWidth={1.75} />
          <span className="manuia-action-tile__title">Upload</span>
          <span className="manuia-action-tile__hint">Foto do equipamento</span>
        </button>
        <button type="button" className="manuia-action-tile" onClick={() => setQrOpen(true)}>
          <QrCode size={20} strokeWidth={1.75} />
          <span className="manuia-action-tile__title">Código / QR</span>
          <span className="manuia-action-tile__hint">Etiqueta ou placa</span>
        </button>
      </div>

      {qrOpen && (
        <div className="manuia-action-qr-overlay" role="presentation" onClick={() => setQrOpen(false)}>
          <div className="manuia-action-qr" role="dialog" aria-labelledby="manuia-qr-title" onClick={(e) => e.stopPropagation()}>
            <div className="manuia-action-qr__head">
              <h3 id="manuia-qr-title">Código da máquina</h3>
              <button type="button" className="manuia-action-qr__close" onClick={() => setQrOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <p className="manuia-action-qr__hint">
              Leia o QR ou digite o código da etiqueta. A pesquisa será iniciada automaticamente.
            </p>
            <form onSubmit={handleQr}>
              <input
                className="manuia-action-qr__input"
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
                placeholder="Ex.: MOT-W22-001 ou código do QR"
                autoFocus
              />
              <button type="submit" className="btn btn-primary manuia-action-qr__submit" disabled={qrValue.trim().length < 2}>
                Pesquisar
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
