import React from 'react';
import { IconShieldCheck } from './socIcons';

function ProtectionItem({ ok, label, title, observe }) {
  const state = observe ? 'observe' : ok ? 'ok' : 'warn';
  return (
    <span
      className={`soc-protection-item soc-protection-item--${state}`}
      title={title || label}
    >
      <span className="soc-protection-indicator" aria-hidden="true">
        {observe ? '◉' : ok ? '✓' : '○'}
      </span>
      <span className="soc-protection-label">{label}</span>
    </span>
  );
}

export default function SocProtectionStrip({ infra, fail2banAvailable }) {
  const secMode = infra.security_mode || 'observe';
  const isObserve = secMode === 'observe';

  return (
    <section className="soc-protection-strip" aria-label="Protecção activa">
      <h3 className="soc-protection-strip-title">
        <IconShieldCheck size={14} />
        Protecção activa
      </h3>
      <div className="soc-protection-strip-items">
        <ProtectionItem ok={infra.cloudflare_proxy_guard} label="Cloudflare guard" />
        <ProtectionItem ok={infra.cloudflare_real_ip} label="CF real IP" />
        <ProtectionItem ok={infra.ssl?.valid} label={`SSL ${infra.ssl?.domain || ''}`.trim()} title={infra.ssl?.expires_at ? `Válido até ${new Date(infra.ssl.expires_at).toLocaleDateString('pt-BR')}` : undefined} />
        <ProtectionItem ok={infra.turnstile} label="Turnstile painel" />
        <ProtectionItem ok={infra.admin_mfa_enabled} label="2FA admin" />
        <ProtectionItem ok={infra.threat_watch_config} label="Threat-watch" />
        <ProtectionItem ok={infra.security_observatory} observe={isObserve} label={`IA segurança (${secMode})`} />
        <ProtectionItem ok={fail2banAvailable} label="fail2ban" />
      </div>
    </section>
  );
}
