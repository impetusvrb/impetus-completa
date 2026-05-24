/**
 * Execução global de comandos de painel (PDF, Excel, chat) — independente do SmartPanel montado.
 * Persiste o último output em sessionStorage para envio mesmo com overlay fechado.
 */
import { parsePanelVoiceMetaCommand } from './panelVoiceMetaCommands';
import { sendPanelTextToImpetusChatTargets } from './panelShareToImpetusChat';
import { downloadPanelXlsx, downloadPanelPdf, printPanelOutput, panelOutputToPlainText } from './panelExport';

export const VOICE_PANEL_OUTPUT_KEY = 'impetus_voice_last_panel_output';

let latestPanelOutput = null;

export function setStoredPanelOutput(output) {
  latestPanelOutput = output || null;
  try {
    if (output) {
      sessionStorage.setItem(VOICE_PANEL_OUTPUT_KEY, JSON.stringify(output));
    } else {
      sessionStorage.removeItem(VOICE_PANEL_OUTPUT_KEY);
    }
  } catch (_) {}
}

export function getStoredPanelOutput() {
  if (latestPanelOutput) return latestPanelOutput;
  try {
    const raw = sessionStorage.getItem(VOICE_PANEL_OUTPUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function panelHasContent(out) {
  if (!out) return false;
  if (out.schema === 'impetus_claude_v1' && out.claudePayload) return true;
  if (out.type === 'legacy_voice_visual' && out.legacyVisual) return true;
  if (out.permissionGranted === false) return false;
  return Boolean(
    out.title ||
      (out.chartData || []).length ||
      (out.barData || []).length ||
      out.table?.rows?.length ||
      out.reportContent
  );
}

/**
 * @param {{ kind: string, userQueries?: string[], groupQuery?: string|null, roleQueries?: string[] }} meta
 */
export async function executePanelVoiceMetaWithMeta(meta, { notify } = {}) {
  if (!meta?.kind) return { handled: false };
  return runMetaExecution(meta, { notify });
}

export async function executePanelVoiceMeta(text, { notify } = {}) {
  const meta = parsePanelVoiceMetaCommand(text);
  if (!meta) return { handled: false };
  return runMetaExecution(meta, { notify });
}

async function runMetaExecution(meta, { notify } = {}) {

  const out = getStoredPanelOutput();
  const hasPanel = panelHasContent(out);
  if (!hasPanel) {
    notify?.warning?.('Não há painel para exportar ou enviar. Peça um painel primeiro.');
    return {
      handled: true,
      success: false,
      kind: meta.kind,
      speakLine:
        'Ainda não há nada no painel. Peça primeiro um gráfico ou relatório e depois peça o PDF ou o envio.'
    };
  }

  try {
    if (meta.kind === 'print') {
      const pr = printPanelOutput(out);
      if (!pr.ok) {
        notify?.error?.(pr.error || 'Não foi possível imprimir.');
        return {
          handled: true,
          success: false,
          kind: 'print',
          speakLine: String(pr.error || 'Não consegui abrir a impressão. Permita pop-ups e tente de novo.').slice(
            0,
            200
          )
        };
      }
      notify?.success?.('A preparar impressão…');
      return {
        handled: true,
        success: true,
        kind: 'print',
        speakLine: 'Pronto, abri a janela de impressão do painel. Confirme na caixa de diálogo do browser.'
      };
    }
    if (meta.kind === 'pdf') {
      downloadPanelPdf(out);
      notify?.success?.('PDF a descarregar.');
      return { handled: true, success: true, kind: 'pdf', speakLine: 'Pronto, o PDF está a descarregar.' };
    }
    if (meta.kind === 'excel') {
      await downloadPanelXlsx(out);
      notify?.success?.('Excel a descarregar.');
      return {
        handled: true,
        success: true,
        kind: 'excel',
        speakLine: 'Pronto, a planilha Excel está a descarregar.'
      };
    }
    if (meta.kind === 'chat') {
      const body = panelOutputToPlainText(out);
      const r = await sendPanelTextToImpetusChatTargets(
        {
          userQueries: meta.userQueries || [],
          groupQuery: meta.groupQuery != null ? meta.groupQuery : null,
          roleQueries: meta.roleQueries || []
        },
        body
      );
      let msg;
      if (r.mode === 'group') {
        msg = `Enviado no grupo «${r.groupName}».`;
      } else if (r.mode === 'role') {
        const label = r.roleLabel || r.groupName || 'equipa';
        msg = `Enviado no chat para ${r.names.length} pessoa(s) (${label}): ${r.names.slice(0, 4).join(', ')}${r.names.length > 4 ? '…' : ''}.`;
      } else {
        msg = `Enviado no chat para ${r.names.join(', ')}.`;
      }
      if (r.failures?.length) msg += ` Falhou: ${r.failures.join(', ')}.`;
      if (!r.names?.length) {
        notify?.error?.(msg);
        return {
          handled: true,
          success: false,
          kind: 'chat',
          speakLine: `Não consegui enviar no chat interno. ${(r.failures || []).join(', ')}.`
        };
      }
      notify?.success?.(msg);
      let speakTarget;
      if (r.mode === 'group') speakTarget = `o grupo ${r.groupName}`;
      else if (r.mode === 'role') {
        speakTarget = `${r.names.length} contactos (${r.roleLabel || 'perfil indicado'})`;
      } else speakTarget = (r.names || []).join(', ') || 'destinatário';
      return {
        handled: true,
        success: true,
        kind: 'chat',
        speakLine: `Pronto, enviei o conteúdo do painel no chat interno para ${speakTarget}.`
      };
    }
    if (meta.kind === 'share') {
      const shareText = panelOutputToPlainText(out, 4000);
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({ title: 'Impetus Painel', text: shareText });
          notify?.success?.('Partilha iniciada.');
          return { handled: true, success: true, kind: 'share', speakLine: 'Pronto, a partilhar o painel.' };
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareText || out?.title || '');
          notify?.success?.('Conteúdo copiado para a área de transferência.');
          return {
            handled: true,
            success: true,
            kind: 'share',
            speakLine: 'Pronto, copiei o conteúdo para a área de transferência.'
          };
        }
        notify?.warning?.('Partilha não disponível neste navegador.');
        return {
          handled: true,
          success: false,
          kind: 'share',
          speakLine: 'Não consegui partilhar neste navegador.'
        };
      } catch (e) {
        if (e?.name !== 'AbortError') {
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(shareText || out?.title || '');
              notify?.success?.('Copiado para a área de transferência.');
              return {
                handled: true,
                success: true,
                kind: 'share',
                speakLine: 'Pronto, copiei o conteúdo.'
              };
            }
          } catch (_) {}
          notify?.error?.('Não foi possível partilhar.');
        }
        return { handled: true, success: false, kind: 'share', speakLine: 'Não consegui partilhar.' };
      }
    }
  } catch (e) {
    notify?.error?.(String(e?.response?.data?.error || e?.message || e || 'Erro.'));
    return {
      handled: true,
      success: false,
      kind: meta.kind,
      speakLine: String(e?.message || 'Não consegui concluir essa ação no painel.').slice(0, 200)
    };
  }
  return { handled: false };
}
