/**
 * Painel de comunicação direta
 * Gerente ↔ Usuários, Setores, IA Operacional, Z-API WhatsApp
 */
import React, { useState } from 'react';
import { MessageSquare, Users, Building2, Bot, Send } from 'lucide-react';
import './CommunicationPanel.css';

const DESTINOS = [
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'setores', label: 'Setores', icon: Building2 },
  { id: 'ia', label: 'IA Operacional', icon: Bot },
  { id: 'whatsapp', label: 'WhatsApp (Z-API)', icon: MessageSquare },
];

export default function CommunicationPanel() {
  const [destino, setDestino] = useState('usuarios');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (!mensagem.trim()) return;
    setEnviando(true);
    // TODO: integrar com API de comunicações
    await new Promise((r) => setTimeout(r, 500));
    setMensagem('');
    setEnviando(false);
  };

  return (
    <div className="comm-panel">
      <div className="comm-panel__header">
        <MessageSquare size={20} />
        <span>Comunicação Direta</span>
      </div>
      <div className="comm-panel__destinos">
        {DESTINOS.map((d) => {
          const Icon = d.icon;
          const ativo = destino === d.id;
          return (
            <button
              key={d.id}
              className={`comm-panel__destino ${ativo ? 'comm-panel__destino--ativo' : ''}`}
              onClick={() => setDestino(d.id)}
            >
              <Icon size={18} />
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>
      <textarea
        className="comm-panel__textarea"
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder={
          destino === 'whatsapp'
            ? 'Digite a mensagem para WhatsApp...'
            : `Enviar mensagem para ${DESTINOS.find((d) => d.id === destino)?.label}...`
        }
        rows={4}
      />
      <div className="comm-panel__footer">
        <button
          className="btn btn-primary"
          onClick={handleEnviar}
          disabled={!mensagem.trim() || enviando}
        >
          <Send size={18} />
          Enviar
        </button>
      </div>
    </div>
  );
}
