/**
 * Comandos de voz sobre o painel (imprimir, PDF, Excel, enviar no chat).
 * Suporta cortesia ("por favor", "por gentileza"), vários nomes e grupos.
 */

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Remove preâmbulos educados e interjeições à IA no início. */
export function stripCourtesyPrefixes(text) {
  let t = String(text || '').trim();
  for (let i = 0; i < 8; i++) {
    const next = t
      .replace(/^(?:ol[áa]|oi|ei)[,.\s-]+/i, '')
      .replace(/^(?:por\s+favor\s+e\s+)?por\s+gentileza[,.\s]+/i, '')
      .replace(/^por\s+favor[,.\s]+/i, '')
      .replace(/^favor[,.\s]+/i, '')
      .replace(/^(?:ei\s+)?ia[,.\s-]+/i, '')
      .replace(/^por\s+favor\s+ia[,.\s-]*/i, '')
      .trim();
    if (next === t) break;
    t = next;
  }
  return t.trim();
}

/** Remove cortesia no fim («por favor», «obrigado») para comandos curtos funcionarem com STT. */
export function stripCourtesySuffixes(text) {
  let t = String(text || '').trim();
  for (let i = 0; i < 8; i++) {
    const next = t
      .replace(/[,.\s]+(?:por\s+favor|por\s+gentileza|obrigad[oa]|valeu|brigad[oa])\s*$/i, '')
      .replace(/\s+(?:por\s+favor|por\s+gentileza|obrigad[oa]|valeu|brigad[oa])\s*$/i, '')
      .replace(/[.!?…]+\s*$/g, '')
      .trim();
    if (next === t) break;
    t = next;
  }
  return t.trim();
}

/** Verbos de envio (voz/STT) — inclui imperativo «envie». */
const SEND_VERB_RE =
  '(?:enviar|envia|envie|mande|manda|mandar)';

/**
 * «Enviar para Fulano» sem «no chat» só se a frase for claramente um comando curto,
 * não uma descrição («o sistema manda alertas para o gestor» → não é meta).
 */
function looksLikeImplicitChatCommand(rawTrim) {
  const t = String(rawTrim || '').trim();
  const afterCourtesy = t.replace(/^(?:por\s+favor|por\s+gentileza)\s+/i, '').trim();
  const afterSubject = afterCourtesy.replace(/^(?:eu|n[oó]s)\s+/i, '').trim();
  const lead = new RegExp(
    `^(?:${SEND_VERB_RE}|(?:quero|preciso)\\s+${SEND_VERB_RE})\\b`,
    'i'
  );
  return lead.test(afterCourtesy) || lead.test(afterSubject);
}

/** Destinatários que são fase/processo, não conversa Impetus («para revisão», «para produção»). */
const WORKFLOW_RECIPIENT_BLOCK =
  /^(?:revis[aã]o|produ[cç][aã]o|fabrica|f[aá]brica|sistema|homolog|staging|an[aá]lise|aprova[cç][aã]o|qualidade)$/i;

function chatTargetsSanity(chat) {
  if (!chat) return false;
  if (chat.groupQuery && String(chat.groupQuery).trim().length >= 2) return true;
  const uq = chat.userQueries || [];
  if (!uq.length) return false;
  return uq.some((q) => !WORKFLOW_RECIPIENT_BLOCK.test(norm(String(q).trim())));
}

/**
 * Parte lista de nomes após "para": "joão, wellington e maria" → três entradas.
 */
function splitRecipientList(frag) {
  let f = String(frag || '').trim();
  f = f.replace(/^(?:esse|este|o|a)\s+(?:painel|relat[oó]rio|resumo)\s+/i, '').trim();
  f = f.replace(/^(?:o|a|os|as)\s+/i, '').trim();
  f = f.replace(/^(?:contatos?|contactos?)\s+de\s+/i, '').trim();
  f = f.replace(/^(?:as\s+)?pessoas?\s+/i, '').trim();
  if (!f || f.length < 2) return [];

  const chunks = f.split(/\s*,\s*/);
  const names = [];
  for (const chunk of chunks) {
    for (const part of chunk.split(/\s+e\s+/i)) {
      const name = part.trim().replace(/^(?:o|a|os|as)\s+/i, '').trim();
      if (name.length >= 2 && !/^(?:relat|painel|resumo|isto|isso)\b/i.test(name)) names.push(name);
    }
  }
  return names;
}

/**
 * @returns {{ userQueries: string[], groupQuery: string | null } | null}
 */
function parseChatTargets(t) {
  const rawTrim = String(t || '').trim();
  const n = norm(rawTrim);
  if (!new RegExp(`\\b${SEND_VERB_RE}\\b`).test(n)) return null;

  const hasChatCtx =
    /\bno\s+chat\b/.test(n) ||
    /\bchat\s+interno\b/.test(n) ||
    /\bchat\s+impetus\b/.test(n) ||
    /\bimpetus\s+chat\b/.test(n) ||
    /\bno\s+impetus\b/.test(n);

  // Grupo existente: "para o grupo Operações no chat", "enviar para o grupo Vendas no impetus"
  const groupRe = new RegExp(
    `\\b(?:para|pr[oa]|no|ao)\\s+(?:o\\s+|a\\s+)?grupo\\s+(.+?)(?:\\s+no\\s+chat|\\s+no\\s+impetus|\\s+do\\s+chat|\\.?\\s*$)`,
    'i'
  );
  const gm = rawTrim.match(groupRe);
  if (gm) {
    let gname = gm[1].trim().replace(/\s+no\s+(?:chat|impetus).*$/i, '').trim();
    gname = gname.replace(/^(?:o|a)\s+/i, '').trim();
    if (gname.length >= 2) return { userQueries: [], groupQuery: gname };
  }

  // "enviar no chat interno para o João" (para vem DEPOIS do marcador — antes falhava)
  const directNoChatPara = rawTrim.match(
    new RegExp(
      `\\b${SEND_VERB_RE}\\s+no\\s+chat(?:\\s+interno)?\\s+para\\s+(.+?)\\s*$`,
      'i'
    )
  );
  if (directNoChatPara) {
    let frag = directNoChatPara[1].trim();
    if (/^grupo\s+/i.test(frag)) {
      const rest = frag.replace(/^grupo\s+/i, '').trim();
      if (rest.length >= 2) return { userQueries: [], groupQuery: rest };
    }
    frag = frag.replace(/^(?:o|a|os|as)\s+/i, '').trim();
    const userQueries = splitRecipientList(frag);
    if (userQueries.length) return { userQueries, groupQuery: null };
  }
  const directImpPara = rawTrim.match(
    new RegExp(`\\b${SEND_VERB_RE}\\s+no\\s+impetus\\s+para\\s+(.+?)\\s*$`, 'i')
  );
  if (directImpPara) {
    let frag = directImpPara[1].trim();
    if (/^grupo\s+/i.test(frag)) {
      const rest = frag.replace(/^grupo\s+/i, '').trim();
      if (rest.length >= 2) return { userQueries: [], groupQuery: rest };
    }
    frag = frag.replace(/^(?:o|a|os|as)\s+/i, '').trim();
    const userQueries = splitRecipientList(frag);
    if (userQueries.length) return { userQueries, groupQuery: null };
  }

  let cut = rawTrim.search(/\s+no\s+chat\s+interno\b/i);
  if (cut === -1) cut = rawTrim.search(/\s+no\s+chat\b/i);
  if (cut === -1) {
    const ni = rawTrim.search(/\s+no\s+impetus/i);
    if (ni !== -1) cut = ni;
  }
  if (cut === -1) {
    const m1 = rawTrim.match(/\bchat\s+impetus\b/i);
    if (m1 && m1.index != null) cut = m1.index;
  }
  if (cut === -1) {
    const m2 = rawTrim.match(/\bimpetus\s+chat\b/i);
    if (m2 && m2.index != null) cut = m2.index;
  }

  let before;
  if (cut !== -1) {
    before = rawTrim.slice(0, cut).trim();
    let tail = rawTrim.slice(cut).trim();
    tail = tail.replace(/^no\s+chat(?:\s+interno)?\b/i, '').trim();
    tail = tail.replace(/^no\s+impetus\b/i, '').trim();
    tail = tail.replace(/^chat\s+impetus\b/i, '').trim();
    tail = tail.replace(/^impetus\s+chat\b/i, '').trim();
    const tailPara = tail.match(/^para\s+(.+)/i);
    if (tailPara) {
      let frag = tailPara[1].trim();
      if (/^grupo\s+/i.test(frag)) {
        const rest = frag.replace(/^grupo\s+/i, '').trim();
        if (rest.length >= 2) return { userQueries: [], groupQuery: rest.replace(/\s+no\s+chat.*$/i, '').trim() };
      }
      frag = frag.replace(/^(?:o|a|os|as)\s+/i, '').trim();
      const uq = splitRecipientList(frag);
      if (uq.length) return { userQueries: uq, groupQuery: null };
    }
  } else if (hasChatCtx) {
    return null;
  } else {
    // Impetus chat interno por omissão: "enviar para juh rodrigues" (sem dizer "no chat")
    if (rawTrim.length > 130) return null;
    if (!/\bpara\b/.test(n)) return null;
    if (/\b(email|e-mail|whatsapp|telegram|sms)\b/.test(n)) return null;
    const blockedImplicit =
      /\b(mostrar|mostra|exibir|exibe|gr[aá]fico|quero\s+ver|dados\s+de|gere|gera|crie|cria|fa[çc]a|faz|monte|monta|explique|analise|analisa)\b/i.test(
        n
      );
    if (blockedImplicit) return null;
    if (!looksLikeImplicitChatCommand(rawTrim)) return null;
    before = rawTrim;
  }

  const paraRe = /\bpara\b/gi;
  let lastIdx = -1;
  let m;
  while ((m = paraRe.exec(before)) !== null) lastIdx = m.index;
  if (lastIdx === -1) return null;

  let frag = before.slice(lastIdx).replace(/^\s*para\s+/i, '').trim();
  if (/^grupo\s+/i.test(frag)) {
    const rest = frag.replace(/^grupo\s+/i, '').trim();
    if (rest.length >= 2) return { userQueries: [], groupQuery: rest.replace(/\s+no\s+chat.*$/i, '').trim() };
  }

  frag = frag.replace(/^(?:o|a|os|as)\s+/i, '').trim();
  const userQueries = splitRecipientList(frag);
  if (!userQueries.length) return null;
  return { userQueries, groupQuery: null };
}

/**
 * Partilhar / copiar (ícone Share) e «enviar» sem destinatário (= partilha nativa ou área de transferência).
 * Frases de conversa com «partilhar» no meio NÃO são comando (evita cancelar o Realtime à toa).
 */
function parseShareIntent(stripped) {
  const sn = String(stripped || '')
    .trim()
    .replace(/[.!?…]+$/g, '')
    .trim();
  const n = norm(sn);
  if (!sn || sn.length > 88) return null;

  if (new RegExp(`\\b${SEND_VERB_RE}\\s+para\\s+`, 'i').test(sn)) return null;

  const looksConversational =
    /\b(como|quando|onde|por\s+que|porque|qual|quais|o\s+que|que\s|sera|será|pode\s|podia|d[aá]\s+para|explica|mostra|quero\s+saber|devo|deveria|achas|acha|n[aã]o\s+sei|seria\s+poss|gostaria|d[uú]vida)\b/i.test(
      n
    );
  if (looksConversational && sn.length > 28) return null;

  const shortPartilhar =
    /^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:ia\s+)?(partilhar|partilha|compartilhar|compartilha)(\s+(?:isso|isto|o\s+painel|este\s+painel|esse\s+painel|o\s+relat[oó]rio|o\s+resumo|agora|tudo|aqui))?$/i.test(
      sn
    );
  const shortShareEn =
    /^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:ia\s+)?share(\s+(?:this|it|the\s+panel|now))?$/i.test(sn);
  if (shortPartilhar || shortShareEn) return { kind: 'share' };

  if (
    /\bcopiar\b/i.test(sn) &&
    /\b(isso|isto|painel|relat|resumo|tudo|conte[uú]do)\b/i.test(n) &&
    sn.length <= 72 &&
    (!looksConversational || sn.length <= 22)
  ) {
    return { kind: 'share' };
  }

  const sendNoChatBare = new RegExp(
    `\\b${SEND_VERB_RE}\\s+no\\s+chat\\s*$`,
    'i'
  );
  const sendAoChatBare = new RegExp(`\\b${SEND_VERB_RE}\\s+ao\\s+chat\\s*$`, 'i');
  const sendProChat = new RegExp(
    `\\b${SEND_VERB_RE}\\s+(?:pro|pr[oó])\\s+chat\\s*$`,
    'i'
  );
  if (sendNoChatBare.test(sn) || sendAoChatBare.test(sn) || sendProChat.test(sn)) {
    return { kind: 'share' };
  }

  const sendObjNoChat = new RegExp(
    `^${SEND_VERB_RE}(\\s+(?:isso|isto|isso\\s+a[ií]|aquilo|o\\s+painel|agora|o\\s+relat[oó]rio|este\\s+painel|esse\\s+painel|tudo|o\\s+resumo))?\\s+no\\s+chat\\s*$`,
    'i'
  );
  if (sendObjNoChat.test(sn)) return { kind: 'share' };

  if (
    new RegExp(
      `^${SEND_VERB_RE}(\\s+(?:isso|isto|o\\s+painel|agora|o\\s+relat[oó]rio|este\\s+painel|esse\\s+painel|tudo|o\\s+resumo))?\\s*$`,
      'i'
    ).test(sn)
  ) {
    return { kind: 'share' };
  }

  return null;
}

/** Remove sufixos educados após o verbo de impressão («para mim», «me») para casar com regex curtos. */
function softenPrintTail(soft) {
  let s = String(soft || '').trim();
  for (let j = 0; j < 6; j++) {
    const next = s
      .replace(/\s+para\s+mim\s*$/i, '')
      .replace(/\s+pra\s+mim\s*$/i, '')
      .replace(/\s+para\s+si\s*$/i, '')
      .replace(/\s+para\s+voc[eê]\s*$/i, '')
      .replace(/\s+me\s*$/i, '')
      .trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

function normalizeHyphenImperatives(s) {
  return String(s || '')
    .replace(/\bimprima-me\b/gi, 'imprima me')
    .replace(/\bimprime-me\b/gi, 'imprime me')
    .replace(/\bimprimir-me\b/gi, 'imprimir me');
}

function parseExportMeta(stripped) {
  const sn = normalizeHyphenImperatives(stripped.trim());
  const n = norm(sn.replace(/[,;.]+/g, ' '));
  const soft = n.replace(/\b(por|favor|gentileza|ia|ei|ol[áa]|oi)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const printSoft = softenPrintTail(soft);

  if (
    /\bcomo\b/i.test(n) &&
    /\b(pdf|excel|planilha|xlsx|imprimir|imprime|baixar|exportar|download|partilhar|compartilhar)\b/i.test(sn) &&
    sn.length > 20
  ) {
    return null;
  }

  const tooLong = sn.length > 140;
  const exportWords =
    /\b(imprimir|imprime|imprima|print|impress[aã]o|pdf|excel|planilha|xlsx|exportar|baixar|descarregar|download|salvar|gera|gerar)\b/i.test(
      sn
    );
  if (tooLong && !exportWords) return null;

  const blocked = /\b(mostrar|mostra|exibir|exibe|gr[aá]fico|quero\s+ver|dados\s+de)\b/.test(n);
  if (blocked && sn.length > 40) return null;

  const printOk =
    /^(?:imprimir|imprime|imprima|print)(\s+painel|\s+isto|\s+isso|\s+agora|\s+o\s+painel|\s+este|\s+esse|\s+tudo|\s+o\s+relat[oó]rio|\s+o\s+resumo|\s+para\s+mim|\s+pra\s+mim|\s+para\s+si|\s+para\s+voc[eê]|\s+me|\s+por\s+gentileza|\s+por\s+favor)*\s*$/i.test(
      printSoft
    ) ||
    /^(?:imprimir|imprime|imprima|print)$/i.test(printSoft) ||
    /^(?:faz|fa[çc]a|fazer)\s+(?:a\s+)?impress[aã]o(?:\s+para\s+mim|\s+pra\s+mim)?\b/i.test(sn) ||
    /\b(?:imprimir|imprime|imprima)\s+(?:este|esse|o|esta|essa)\s+(?:painel|relat)\w*/i.test(sn) ||
    (/^(?:por\s+favor\s+|por\s+gentileza\s+)*(imprimir|imprime|imprima|print)\b/i.test(sn) && sn.length <= 120) ||
    (/^(?:imprimir|imprime|imprima)\b/i.test(sn) && /\b(por\s+favor|por\s+gentileza)\b/i.test(sn) && sn.length <= 120) ||
    (/^(?:quero|preciso)\s+(?:imprimir|imprima|fazer\s+impress)/i.test(sn) && sn.length <= 100) ||
    (/\b(?:imprimir|imprime|imprima)\s+para\s+mim\b/i.test(sn) && sn.length <= 100) ||
    (/\b(?:imprimir|imprime|imprima)\s+pra\s+mim\b/i.test(sn) && sn.length <= 100) ||
    (/\b(?:imprimir|imprime|imprima)\s+para\s+si\b/i.test(sn) && sn.length <= 100) ||
    (/^(?:imprimir|imprime|imprima|print)\s+me\b/i.test(n) && sn.length <= 100);

  if (printOk) return { kind: 'print' };

  const pdfOk =
    /^pdf|baixar\s+pdf|exportar\s+pdf|download\s+pdf|baixar\s+o\s+pdf|salvar\s+pdf|salvar\s+o\s+pdf$/i.test(soft) ||
    /\b(?:gera|gerar|quero|preciso)\s+(?:o\s+)?pdf\b/i.test(sn) ||
    (/\b(?:baixar|descarregar|exportar)\s+(?:o\s+)?relat[oó]rio\b/i.test(sn) && sn.length <= 52) ||
    (/^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:o\s+)?pdf$/i.test(sn) && sn.length <= 90) ||
    (/^(?:quero|preciso)\s+(?:o\s+)?pdf$/i.test(sn) && sn.length <= 80);

  if (pdfOk) return { kind: 'pdf' };

  const downloadOk =
    /^baixar|descarregar|download$/i.test(soft) ||
    /^(?:baixar|descarregar|download)(\s+painel|\s+isto|\s+isso|\s+agora|\s+o\s+painel|\s+este|\s+esse|\s+tudo|\s+o\s+pdf|\s+por\s+favor|\s+por\s+gentileza)*\s*$/i.test(
      soft
    ) ||
    (/^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:baixar|descarregar)$/i.test(sn) && sn.length <= 100) ||
    (/^(?:quero|preciso)\s+(?:baixar|descarregar)/i.test(sn) && sn.length <= 90);

  if (downloadOk) return { kind: 'pdf' };

  const excelOk =
    /^excel|planilha|xlsx|exportar\s+excel|baixar\s+excel|exportar\s+a\s+planilha|baixar\s+a\s+planilha$/i.test(soft) ||
    /\b(?:quero|preciso|gera|gerar)\s+(?:a\s+)?planilha\b/i.test(sn) ||
    /\b(?:quero|preciso|gera|gerar)\s+(?:o\s+)?excel\b/i.test(sn) ||
    (/^(?:por\s+favor\s+|por\s+gentileza\s+)?(?:a\s+)?planilha$/i.test(sn) && sn.length <= 90) ||
    (/^(?:quero|preciso)\s+(?:o\s+)?excel$/i.test(sn) && sn.length <= 80) ||
    (/^(?:quero|preciso)\s+(?:a\s+)?planilha$/i.test(sn) && sn.length <= 80);

  if (excelOk) return { kind: 'excel' };

  return null;
}

/**
 * @param {string} text
 * @returns {{ kind: 'print' | 'pdf' | 'excel' | 'chat' | 'share', userQueries?: string[], groupQuery?: string | null } | null}
 */
export function parsePanelVoiceMetaCommand(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const stripped = stripCourtesySuffixes(stripCourtesyPrefixes(raw));

  if (stripped.length <= 420) {
    const chat = parseChatTargets(stripped);
    if (
      chat &&
      chatTargetsSanity(chat) &&
      (chat.groupQuery || (chat.userQueries && chat.userQueries.length))
    )
      return { kind: 'chat', userQueries: chat.userQueries, groupQuery: chat.groupQuery };
  }

  const shareMeta = parseShareIntent(stripped);
  if (shareMeta) return shareMeta;

  const exportMeta = parseExportMeta(stripped);
  if (exportMeta) return exportMeta;

  return null;
}
