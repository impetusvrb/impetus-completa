const OpenAI = require('openai');
const chatService = require('./chatService');
const AI_USER_ID = chatService.AI_USER_ID;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function handleAIMessage(conversationId, triggerMessage, io) {
  try {
    const history = await chatService.getMessages(conversationId, AI_USER_ID, 30);
    const msgs = [
      { role: 'system', content: 'Voce e a Impetus IA, assistente do chat interno IMPETUS. Responda em portugues, de forma concisa e profissional.' },
      ...history.slice(-20).map(m => ({ role: m.sender_id === AI_USER_ID ? 'assistant' : 'user', content: (m.sender?.name||'Usuario')+': '+(m.content||'[arquivo]') }))
    ];
    const r = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: msgs, max_tokens: 600, temperature: 0.7 });
    const txt = r.choices[0]?.message?.content || 'Nao consegui processar.';
    const saved = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: txt });
    if (io) io.to(conversationId).emit('new_message', saved);
    return saved;
  } catch (err) {
    console.error('[CHAT_AI_ERROR]', err.message);
    const e = await chatService.saveMessage({ conversationId, senderId: AI_USER_ID, type: 'ai', content: 'Erro ao processar solicitacao.' });
    if (io) io.to(conversationId).emit('new_message', e);
    return e;
  }
}
function mentionsAI(c) { return c ? /(@ImpetusIA|@impetus_ia|@ia)/i.test(c) : false; }
module.exports = { handleAIMessage, mentionsAI, AI_USER_ID };
