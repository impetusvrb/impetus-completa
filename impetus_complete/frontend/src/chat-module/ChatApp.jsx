import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationList from './components/ConversationList';
import MessageArea from './components/MessageArea';
import MessageInput from './components/MessageInput';
import { useChatSocket } from './hooks/useChatSocket';
import { useMessages } from './hooks/useMessages';
import chatApi from './services/chatApi';
import { useVoiceOutput } from '../hooks/useVoiceOutput';
import { dashboard } from '../services/api';
import { User, ArrowLeft, Menu, Send, ClipboardList, X, CheckCircle, AlertTriangle, Mic, MicOff } from 'lucide-react';
import impetusIaAvatar from '../assets/impetus-ia-avatar.png';
import './styles/chat.css';

const API_BASE = (() => {
  const api = import.meta.env.VITE_API_URL || '/api';
  if (api.startsWith('http')) return api.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
})();
function toAbs(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  try { return encodeURI(API_BASE + url); } catch { return API_BASE + url; }
}

function convTitle(c,uid){ if(!c) return 'Chat'; if(c.type==='group') return c.name||'Grupo'; const o=c.participants&&c.participants.find(p=>p.id!==uid); return o&&(o.name||o.email)||'Conversa'; }

export default function ChatApp(){
  const [conversations,setConversations]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [onlineUsers,setOnlineUsers]=useState(new Set());
  const [typingUsers,setTypingUsers]=useState([]);
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const AI_CONV_ID='impetus-ia';
  const [aiMessages,setAiMessages]=useState([{id:'init',content:'Ola! Sou a Impetus IA. Como posso ajudar?',isUser:false,created_at:new Date().toISOString()}]);
  const [aiInput,setAiInput]=useState('');
  const [aiLoading,setAiLoading]=useState(false);
  const [showRegistro,setShowRegistro]=useState(false);
  const [registroText,setRegistroText]=useState('');
  const [registroLoading,setRegistroLoading]=useState(false);
  const [registroResult,setRegistroResult]=useState(null);
  const [currentUser,setCurrentUser]=useState(null);
  const [voiceMode,setVoiceMode]=useState(false);
  const typingTimers=useRef({});
  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceOutput({});
  const recognitionRef = useRef(null);
  const activeConv=conversations.find(c=>c.id===activeId);
  const {messages,loading,hasMore,loadMessages,addMessage,reset}=useMessages(activeId);

  useEffect(()=>{
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/chat-sw.js').catch(()=>{});
    }
  }, []);
  useEffect(()=>{ const s=localStorage.getItem('impetus_user'); if(s){ try{ setCurrentUser(JSON.parse(s)); }catch{} } loadConversations(); },[]);
  useEffect(()=>{ if(!activeId) return; reset(); setTypingUsers([]); },[activeId]);
  useEffect(()=>{ if(activeId) loadMessages(true); },[activeId]);

  useEffect(()=>()=>{ Object.values(typingTimers.current||{}).forEach(t=>clearTimeout(t)); typingTimers.current={}; },[]);

  // Wakeword + comando (apenas na conversa Impetus IA e com modo voz ativo)
  useEffect(() => {
    if (!voiceMode || activeId !== AI_CONV_ID) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(_) {}
        recognitionRef.current = null;
      }
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = async (event) => {
      const last = event.results.length - 1;
      const transcript = (event.results[last][0].transcript || '').toLowerCase().trim();
      if (transcript.includes('ok impetus') || transcript.includes('olá impetus') || transcript.includes('ola impetus')) {
        const greeting = 'Estou ouvindo. Pode falar.';
        setAiMessages((m) => [...m, { id: 'wake-' + Date.now(), content: greeting, isUser: false, created_at: new Date().toISOString() }]);
        speak(greeting);
        try {
          const comandoRec = new SpeechRecognition();
          comandoRec.lang = 'pt-BR';
          comandoRec.continuous = false;
          comandoRec.interimResults = false;
          comandoRec.onresult = async (ev) => {
            const comando = (ev.results?.[0]?.[0]?.transcript || '').trim();
            if (!comando) return;
            setAiMessages((m) => [...m, { id: 'cmd-' + Date.now(), content: `[Comando de voz] ${comando}`, isUser: true, created_at: new Date().toISOString() }]);
            try {
              const r = await dashboard.comandoVoz(comando, true);
              const resposta = r.data?.resposta || 'Não entendi o comando.';
              setAiMessages((m) => [...m, { id: 'cmd-rep-' + Date.now(), content: resposta, isUser: false, created_at: new Date().toISOString() }]);
              if (r.data?.audio) {
                const audio = new Audio('data:audio/mp3;base64,' + r.data.audio);
                audio.play().catch(() => speak(resposta));
              } else {
                speak(resposta);
              }
            } catch {
              const resposta = 'Não consegui processar o comando agora.';
              setAiMessages((m) => [...m, { id: 'cmd-rep-' + Date.now(), content: resposta, isUser: false, created_at: new Date().toISOString() }]);
              speak(resposta);
            }
          };
          setTimeout(() => { try { comandoRec.start(); } catch(_) {} }, 1200);
        } catch (_) {}
      }
    };
    recognition.onerror = () => {};
    try { recognition.start(); } catch(_) {}
    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch(_) {}
      recognitionRef.current = null;
    };
  }, [voiceMode, activeId, speak]);

  async function loadConversations(){ try{ const {data}=await chatApi.getConversations(); setConversations(data); }catch(e){ console.error(e); } }

  const onMessage=useCallback((msg)=>{
    addMessage(msg);
    setConversations(prev=>prev.map(c=>c.id===msg.conversation_id?{...c,last_message:msg,updated_at:msg.created_at}:c).sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)));
  },[addMessage]);

  const onTyping=useCallback(({conversationId,userId,userName})=>{
    if(conversationId!==activeId) return;
    setTypingUsers(prev=>prev.some(u=>u.userId===userId)?prev:[...prev,{userId,userName}]);
    clearTimeout(typingTimers.current[userId]);
    typingTimers.current[userId]=setTimeout(()=>setTypingUsers(prev=>prev.filter(u=>u.userId!==userId)),3000);
  },[activeId]);

  const onStopTyping=useCallback(({userId})=>{ clearTimeout(typingTimers.current[userId]); setTypingUsers(prev=>prev.filter(u=>u.userId!==userId)); },[]);
  const onOnline=useCallback(({userId})=>setOnlineUsers(prev=>new Set([...prev,userId])),[]);
  const onOffline=useCallback(({userId})=>setOnlineUsers(prev=>{ const s=new Set(prev); s.delete(userId); return s; }),[]);
  const onProfileUpdate=useCallback(({userId,avatar_url})=>{
    setConversations(prev => prev.map((c) => ({
      ...c,
      participants: (c.participants || []).map((p) => (p.id === userId ? { ...p, avatar_url } : p))
    })));
  },[]);

  const {sendMessage,emitTyping,emitStopTyping,markRead,joinConversation}=useChatSocket({onMessage,onTyping,onStopTyping,onOnline,onOffline,onProfileUpdate});

  async function selectConv(id){ await loadConversations(); setActiveId(id); joinConversation(id); markRead(id); if(window.innerWidth<768) setSidebarOpen(false); }
  async function handleSend({type,content}){ if(!activeId) return; try{ await sendMessage({conversationId:activeId,content,type}); }catch(e){ console.error(e); } }

  async function handleAiSend(){
    if(!aiInput.trim()||aiLoading) return;
    if(voiceMode&&isSpeaking) stopSpeaking();
    const text=aiInput.trim(); setAiInput(''); setAiLoading(true);
    const userMsg={id:Date.now(),content:text,isUser:true,created_at:new Date().toISOString()};
    setAiMessages(prev=>[...prev,userMsg]);
    try{
      const hist=[...aiMessages,userMsg].map(m=>({role:m.isUser?'user':'assistant',content:m.content}));
      const {data}=await chatApi.sendAIMessage(hist);
      const reply=(data&&(data.reply||data.message||data.content))||'Sem resposta';
      setAiMessages(prev=>[...prev,{id:Date.now()+1,content:reply,isUser:false,created_at:new Date().toISOString()}]);
      if(voiceMode) speak(reply);
    }catch(e){
      const errMsg='Erro ao conectar com a IA.';
      setAiMessages(prev=>[...prev,{id:Date.now()+1,content:errMsg,isUser:false,created_at:new Date().toISOString()}]);
      if(voiceMode) speak(errMsg);
    } finally{ setAiLoading(false); }
  }

  async function handleRegistro(){
    if(!registroText.trim()||registroLoading) return;
    setRegistroLoading(true); setRegistroResult(null);
    try{
      const {data}=await chatApi.submitRegistration(registroText.trim());
      setRegistroResult({ok:true, data:data?.data||data});
      setRegistroText('');
    }catch(e){
      setRegistroResult({ok:false, msg:e?.response?.data?.error||'Erro ao registrar'});
    } finally{ setRegistroLoading(false); }
  }

  const otherParticipant=activeConv&&activeConv.participants&&currentUser&&activeConv.participants.find(p=>p.id!==currentUser.id);
  const isOtherOnline=otherParticipant&&(onlineUsers.has(otherParticipant.id) || otherParticipant.status_online === true);
  const lastSeenText = otherParticipant?.ultimo_visto
    ? new Date(otherParticipant.ultimo_visto).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
    : null;

  return (<div className="chat-app">
    <div className="chat-header">
      <button className="btn-icon chat-menu-btn" onClick={()=>setSidebarOpen(v=>!v)}><Menu size={20}/></button>
      <div className="chat-header__brand"><img src="/icons/chat-icon-192.png" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover"}}/><span>IMPETUS Chat</span></div>
      {currentUser&&<div className="chat-header__user"><User size={14}/><span>{currentUser.name||currentUser.email}</span></div>}
      <button onClick={()=>{setShowRegistro(true);setRegistroResult(null);}} title="Registro Inteligente" style={{marginLeft:'auto',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:8,padding:'6px 12px',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:500}}><ClipboardList size={15}/><span style={{display:'none',['@media(min-width:500px)']:{display:'inline'}}}>Registro</span></button>
    </div>
    {showRegistro&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#12121e',border:'1px solid #2a2a3e',borderRadius:16,width:'100%',maxWidth:520,padding:24,display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center'}}><ClipboardList size={18} color="#fff"/></div><div><div style={{color:'#fff',fontWeight:600,fontSize:16}}>Registro Inteligente</div><div style={{color:'#6b7280',fontSize:12}}>A IA analisa e classifica automaticamente</div></div></div>
          <button onClick={()=>{setShowRegistro(false);setRegistroResult(null);}} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer'}}><X size={20}/></button>
        </div>
        {registroResult?(
          <div style={{padding:16,borderRadius:10,background:registroResult.ok?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${registroResult.ok?'#22c55e':'#ef4444'}`,display:'flex',gap:10,alignItems:'flex-start'}}>
            {registroResult.ok?<CheckCircle size={18} color="#22c55e" style={{flexShrink:0,marginTop:2}}/>:<AlertTriangle size={18} color="#ef4444" style={{flexShrink:0,marginTop:2}}/>}
            <div style={{color:'#fff',fontSize:14}}>{registroResult.ok?(<><div style={{fontWeight:600,color:'#22c55e',marginBottom:4}}>Registro criado com sucesso!</div>{registroResult.data?.summary&&<div style={{color:'#d1d5db'}}>{registroResult.data.summary}</div>}</>):<span style={{color:'#ef4444'}}>{registroResult.msg}</span>}</div>
          </div>
        ):(
          <>
            <textarea value={registroText} onChange={e=>setRegistroText(e.target.value)} placeholder="Descreva o ocorrido, problema, observação ou situação... A IA irá analisar, classificar e registrar automaticamente." rows={5} style={{background:'#1e1e2e',border:'1px solid #3a3a5e',borderRadius:10,padding:12,color:'#fff',fontSize:14,resize:'vertical',outline:'none',fontFamily:'inherit'}}/>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowRegistro(false)} style={{padding:'8px 16px',borderRadius:8,background:'#1e1e2e',border:'1px solid #3a3a5e',color:'#9ca3af',cursor:'pointer',fontSize:14}}>Cancelar</button>
              <button onClick={handleRegistro} disabled={registroLoading||!registroText.trim()} style={{padding:'8px 20px',borderRadius:8,background:registroLoading||!registroText.trim()?'#2a2a3e':'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',cursor:registroLoading||!registroText.trim()?'not-allowed':'pointer',fontSize:14,fontWeight:500}}>{registroLoading?'Registrando...':'Registrar'}</button>
            </div>
          </>
        )}
        {registroResult?.ok&&<button onClick={()=>{setShowRegistro(false);setRegistroResult(null);}} style={{padding:'8px 16px',borderRadius:8,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:500,alignSelf:'flex-end'}}>Fechar</button>}
      </div>
    </div>}
    <div className="chat-body">
      <div className={'chat-sidebar'+(sidebarOpen?' open':' closed')}>
        <ConversationList conversations={conversations} activeId={activeId} onSelect={selectConv} currentUserId={currentUser&&currentUser.id} onlineUsers={onlineUsers} onRefresh={loadConversations}/>
      </div>
      <div className="chat-main">
        {activeId===AI_CONV_ID?(<>
          <div className="chat-conv-header">
            <button className="btn-icon" onClick={()=>{setActiveId(null);setSidebarOpen(true);}}><ArrowLeft size={18}/></button>
            <div className="chat-conv-info" style={{display:'flex',alignItems:'center',gap:8}}>
              <img src={impetusIaAvatar} alt="" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover'}}/>
              <div><span className="chat-conv-name">Impetus IA</span><br/><span style={{color:'#22c55e',fontSize:11}}>online</span></div>
            </div>
            <button onClick={()=>setVoiceMode(v=>!v)} title={voiceMode?'Desativar voz':'Ativar voz (IA fala as respostas)'} style={{marginLeft:'auto',width:36,height:36,borderRadius:'50%',border:'none',background:voiceMode?'#6366f1':'#2a2a3e',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{voiceMode?<MicOff size={18}/>:<Mic size={18}/>}</button>
          </div>
          <div className="msg-area" style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
            {aiMessages.map(msg=>(<div key={msg.id} style={{display:'flex',justifyContent:msg.isUser?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
              {!msg.isUser&&<img src={impetusIaAvatar} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>}
              <div style={{maxWidth:'72%',padding:'10px 14px',borderRadius:msg.isUser?'18px 18px 4px 18px':'18px 18px 18px 4px',background:msg.isUser?'#6366f1':'#1e1e2e',color:'#fff',fontSize:14,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{msg.content}<div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:4,textAlign:'right'}}>{new Date(msg.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div>
            </div>))}
            {aiLoading&&<div style={{display:'flex',gap:8}}><img src={impetusIaAvatar} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}}/><div style={{padding:'10px 14px',borderRadius:'18px 18px 18px 4px',background:'#1e1e2e',color:'#a0a0b0',fontSize:14}}>Digitando...</div></div>}
          </div>
          <div style={{padding:'12px 16px',borderTop:'1px solid #2a2a3e',display:'flex',gap:8,background:'#12121e'}}>
            <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),handleAiSend())} placeholder="Pergunte algo para a Impetus IA..." style={{flex:1,background:'#1e1e2e',border:'1px solid #3a3a5e',borderRadius:12,padding:'10px 14px',color:'#fff',fontSize:14,outline:'none'}}/>
            <button onClick={handleAiSend} disabled={aiLoading||!aiInput.trim()} style={{width:40,height:40,borderRadius:'50%',background:aiLoading||!aiInput.trim()?'#2a2a3e':'#6366f1',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Send size={16} color="#fff"/></button>
          </div>
        </>):activeConv?(<>
          <div className="chat-conv-header">
            <button className="btn-icon" onClick={()=>{ setActiveId(null); setSidebarOpen(true); }}><ArrowLeft size={18}/></button>
            <div className="chat-conv-info" style={activeConv.type!=='group' ? { display:'flex', alignItems:'center', gap:8 } : undefined}>
              {activeConv.type!=='group' && otherParticipant?.avatar_url && (
                <img src={toAbs(otherParticipant.avatar_url)} alt="" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
              )}
              <div>
                <span className="chat-conv-name">{convTitle(activeConv,currentUser&&currentUser.id)}</span>
                <span className="chat-conv-meta" style={{ display:'block' }}>
                  {activeConv.type==='group'
                    ? ((activeConv.participants&&activeConv.participants.length||0)+' participantes')
                    : (isOtherOnline ? <span style={{ color:'#22c55e' }}>online</span> : (lastSeenText ? `Visto por último às ${lastSeenText}` : 'offline'))}
                </span>
              </div>
            </div>
          </div>
          <MessageArea messages={messages} currentUserId={currentUser&&currentUser.id} loading={loading} hasMore={hasMore} onLoadMore={()=>loadMessages(false)} typingUsers={typingUsers}/>
          <MessageInput conversationId={activeId} onSend={handleSend} onTyping={()=>emitTyping(activeId)} onStopTyping={()=>emitStopTyping(activeId)}/>
        </>):(
          <div className="chat-welcome"><img src="/icons/chat-icon-192.png" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover"}}/><h2>IMPETUS Chat</h2><p>Selecione uma conversa ou inicie uma nova</p></div>
        )}
      </div>
    </div>
  </div>);
}
