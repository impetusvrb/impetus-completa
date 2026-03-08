/**
 * Modal obrigatório antes da conexão WhatsApp via Z-API
 * Usuário deve marcar checkbox para habilitar o botão Continuar
 *
 * @param {boolean} isOpen - Controla visibilidade do modal
 * @param {function} onClose - Chamado ao cancelar ou fechar
 * @param {function} onConfirm - Chamado ao clicar Continuar (após checkbox marcado)
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './WhatsAppConnectionWarning.css';

export default function WhatsAppConnectionWarning({ isOpen, onClose, onConfirm }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isOpen) setChecked(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!checked) return;
    onConfirm?.();
    onClose?.();
  };

  const handleClose = () => {
    setChecked(false);
    onClose?.();
  };

  return (
    <div className="whatsapp-warning-overlay" onClick={handleClose}>
      <div className="whatsapp-warning-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="whatsapp-warning-title" aria-modal="true">
        <div className="whatsapp-warning-header">
          <div className="whatsapp-warning-title-row">
            <AlertTriangle size={28} className="whatsapp-warning-icon" />
            <h2 id="whatsapp-warning-title">Aviso Importante – Uso do WhatsApp Business</h2>
          </div>
          <button type="button" className="whatsapp-warning-close" onClick={handleClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="whatsapp-warning-content">
          <p>Para utilizar o módulo de comunicação do IMPETUS:</p>
          <ul>
            <li>Utilize exclusivamente um número de WhatsApp Business.</li>
            <li>Não conecte seu WhatsApp pessoal.</li>
            <li>Recomendamos separar um número dedicado apenas às operações da sua empresa.</li>
          </ul>

          <p>A Inteligência Artificial do IMPETUS irá:</p>
          <ul>
            <li>Coletar e analisar mensagens recebidas neste número</li>
            <li>Classificar tarefas, alertas e ocorrências</li>
            <li>Gerar relatórios operacionais</li>
            <li>Auxiliar na organização da comunicação interna</li>
          </ul>

          <p className="whatsapp-warning-security">
            Por motivos de segurança e conformidade, conecte apenas um número utilizado exclusivamente para fins empresariais.
          </p>

          <div className="whatsapp-warning-privacy">
            <p><strong>🛡️ Privacidade e Segurança de Dados</strong></p>
            <p>E fique tranquilo:</p>
            <ul>
              <li>A IA do IMPETUS somente coletará e analisará mensagens enviadas por usuários que estejam cadastrados e vinculados à rede interna conectada ao software.</li>
              <li>Mensagens trocadas com contatos externos que não estejam vinculados à estrutura organizacional do sistema não serão processadas nem armazenadas pela IA.</li>
              <li>A IA está bloqueada de captar qualquer dado de comunicações externas fora da rede autorizada.</li>
            </ul>
          </div>

          <label className="whatsapp-warning-checkbox">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} aria-required="true" />
            <span>Confirmo que estou conectando um número exclusivo para uso empresarial.</span>
          </label>
        </div>

        <div className="whatsapp-warning-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!checked}>Continuar</button>
        </div>
      </div>
    </div>
  );
}
