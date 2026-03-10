/**
 * Página exibida quando a assinatura está em atraso/suspensa
 * Permite acesso a: link de pagamento (boleto), contato financeiro
 * Nunca exclui dados - apenas bloqueia acesso até regularização
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, MessageCircle, Mail, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { subscription } from '../services/api';
import './ErrorPage.css';

const EMAIL_CONTATO = import.meta.env.VITE_FINANCE_EMAIL || 'financeiro@impetus.com.br';
const WHATSAPP_CONTATO = import.meta.env.VITE_FINANCE_WHATSAPP || '5531999999999';

export default function SubscriptionExpired() {
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('impetus_token')) {
      setLoadingPayment(false);
      return;
    }
    subscription
      .getPaymentLink()
      .then((res) => {
        if (res?.data?.ok && res.data.paymentUrl) {
          setPaymentUrl(res.data.paymentUrl);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPayment(false));
  }, []);

  const whatsappLink = `https://wa.me/${WHATSAPP_CONTATO.replace(/\D/g, '')}?text=Olá, preciso regularizar a assinatura do Impetus Comunica IA.`;
  const emailLink = `mailto:${EMAIL_CONTATO}?subject=Regularização de Assinatura - Impetus Comunica IA`;

  return (
    <div className="error-page subscription-expired-page">
      <div className="error-content">
        <CreditCard size={64} className="error-icon" />
        <h1>Assinatura em Atraso</h1>
        <p>
          O acesso ao sistema foi bloqueado devido ao não pagamento. Regularize sua assinatura para continuar utilizando o Impetus Comunica IA.
        </p>
        <p className="subscription-expired-desc">
          Seu histórico e dados estão preservados. Após a confirmação do pagamento, o acesso será liberado automaticamente.
        </p>

        <div className="subscription-actions">
          {paymentUrl && (
            <a href={paymentUrl} className="btn btn-primary" rel="noopener noreferrer" target="_blank">
              <ExternalLink size={18} />
              Pagar Boleto Agora
            </a>
          )}
          {loadingPayment && !paymentUrl && (
            <span className="subscription-loading">Carregando link de pagamento...</span>
          )}
          <a href={emailLink} className="btn btn-primary" rel="noopener noreferrer" target="_blank">
            <Mail size={18} />
            Contato por Email
          </a>
          <a href={whatsappLink} className="btn btn-primary" rel="noopener noreferrer" target="_blank">
            <MessageCircle size={18} />
            Contato via WhatsApp
          </a>
        </div>

        <div className="error-actions">
          <Link to="/" className="btn btn-secondary">
            <ArrowLeft size={18} />
            Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  );
}
