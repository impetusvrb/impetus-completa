import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConversationList from './components/ConversationList';
import MessageArea from './components/MessageArea';
import MessageInput from './components/MessageInput';
import { useChatSocket } from './hooks/useChatSocket';
import { useMessages } from './hooks/useMessages';
import chatApi from './services/chatApi';
import ProacaoWorkspace from '../features/proacao/ProacaoWorkspace';
import { User, ArrowLeft, Menu, Send, ClipboardList, X, CheckCircle, AlertTriangle, FileText, Upload, Image as ImageIcon, Mic, Target, AlertCircle } from 'lucide-react';
import chatBrandImg from '../assets/chat-brand.png';
import impetusIaAvatar from '../assets/impetus-ia-avatar.png';
import './styles/chat.css';

function convTitle(c,uid){ if(!c) return 'Chat'; if(c.type==='group') return c.name||'Grupo'; const o=c.participants&&c.participants.find(p=>p.id!==uid); return o&&(o.name||o.email)||'Conversa'; }
const API_BASE = (() => {
  const api = import.meta.env.VITE_API_URL || '/api';
  if (api.startsWith('http')) return api.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
})();
function toAbs(url){ if(!url) return null; if(url.startsWith('http')) return url; return API_BASE + url; }

export default function ChatApp(){
  const navigate = useNavigate();
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
  const [showCadastrarIa,setShowCadastrarIa]=useState(false);
  const [cadTexto,setCadTexto]=useState('');
  const [cadSector,setCadSector]=useState('');
  const [cadEquipamento,setCadEquipamento]=useState('');
  const [cadFile,setCadFile]=useState(null);
  const [cadLoading,setCadLoading]=useState(false);
  const [cadResult,setCadResult]=useState(null);
  /** Um único estado evita montar o overlay na aba errada (proposals) antes de aplicar tpm. */
  const [proacaoOverlay, setProacaoOverlay] = useState({ open: false, tab: 'proposals' });
  const [currentUser,setCurrentUser]=useState(null);
  const typingTimers=useRef({});
  const avatarInputRef = useRef(null);
  const activeConv=conversations.find(c=>c.id===activeId);
  const {messages,loading,hasMore,loadMessages,addMessage,removeMessage,markDeletedEveryone,reset}=useMessages(activeId);
  const loadConversations=useCallback(async ()=>{ try{ const {data}=await chatApi.getConversations(); setConversations(data); }catch(e){ console.error(e); } },[]);

  useEffect(()=>{
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      }).catch(() => {});
      if (window.caches && caches.keys) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k).catch(() => {}));
        }).catch(() => {});
      }
    }
  }, []);
  useEffect(()=>{ const s=localStorage.getItem('impetus_user'); if(s){ try{ setCurrentUser(JSON.parse(s)); }catch{} } loadConversations(); },[loadConversations]);
  useEffect(()=>{ if(!activeId) return; reset(); setTypingUsers([]); },[activeId]);
  useEffect(()=>{ if(activeId) loadMessages(true); },[activeId]);

  useEffect(()=>()=>{ Object.values(typingTimers.current||{}).forEach(t=>clearTimeout(t)); typingTimers.current={}; },[]);

  useEffect(() => {
    if (!proacaoOverlay.open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [proacaoOverlay.open]);

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
  const onMessageDeleted=useCallback(({conversationId,messageId,scope})=>{
    if (scope !== 'everyone' || String(conversationId) !== String(activeId)) return;
    markDeletedEveryone(messageId);
  },[activeId,markDeletedEveryone]);

  const {sendMessage,emitTyping,emitStopTyping,markRead,joinConversation}=useChatSocket({onMessage,onTyping,onStopTyping,onOnline,onOffline,onProfileUpdate,onMessageDeleted});

  async function selectConv(id){ await loadConversations(); setActiveId(id); joinConversation(id); markRead(id); if(window.innerWidth<768) setSidebarOpen(false); }
  async function handleSend({type,content}){ if(!activeId) return; try{ await sendMessage({conversationId:activeId,content,type}); }catch(e){ console.error(e); } }

  const handleChatDelete=useCallback(async (msg,scope)=>{
    try{
      await chatApi.deleteMessage(msg.id,scope);
      if(scope==='me') removeMessage(msg.id);
      else markDeletedEveryone(msg.id);
      loadConversations();
    }catch(e){
      console.error(e);
      window.alert(e?.response?.data?.error||'Não foi possível apagar a mensagem.');
    }
  },[removeMessage,markDeletedEveryone,loadConversations]);

  async function handleAiSend(){
    if(!aiInput.trim()||aiLoading) return;
    const text=aiInput.trim(); setAiInput(''); setAiLoading(true);
    const userMsg={id:Date.now(),content:text,isUser:true,created_at:new Date().toISOString()};
    setAiMessages(prev=>[...prev,userMsg]);
    try{
      const history = aiMessages.map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.content || ''
      }));
      const { data } = await chatApi.sendAIMessage({ message: text, history });
      const reply=(data&&(data.reply||data.message||data.content))||'Sem resposta';
      setAiMessages(prev=>[...prev,{id:Date.now()+1,content:reply,isUser:false,created_at:new Date().toISOString()}]);
    }catch(e){
      setAiMessages(prev=>[...prev,{id:Date.now()+1,content:'Erro ao conectar com a IA.',isUser:false,created_at:new Date().toISOString()}]);
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
      <button
        type="button"
        className="chat-header__back"
        title="Voltar ao painel"
        onClick={() => navigate('/app')}
      >
        <ArrowLeft size={20} strokeWidth={2.25} />
        <span className="chat-header__back-text">Voltar</span>
      </button>
      <button className="btn-icon chat-menu-btn" onClick={()=>setSidebarOpen(v=>!v)}><Menu size={20}/></button>
      <div className="chat-header__brand"><img src={chatBrandImg} alt="" style={{width:32,height:32,objectFit:"contain"}}/><span>IMPETUS Chat</span></div>
      {currentUser&&(
        <div className="chat-header__user" style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>avatarInputRef.current?.click()}>
          {currentUser.avatar_url ? (
            <img
              src={toAbs(currentUser.avatar_url)}
              alt=""
              style={{width:22,height:22,borderRadius:'50%',objectFit:'cover'}}
              onError={(e)=>{ e.currentTarget.style.display='none'; }}
            />
          ) : (
            <User size={14}/>
          )}
          <span>{currentUser.name||currentUser.email}</span>
          <input
            ref={avatarInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            style={{display:'none'}}
            onChange={async e=>{
              const file=e.target.files?.[0];
              if(!file) return;
              try{
                const {data}=await chatApi.updateAvatar(file);
                const u=JSON.parse(localStorage.getItem('impetus_user')||'{}');
                const updated={...u,avatar_url:data.avatar_url};
                localStorage.setItem('impetus_user',JSON.stringify(updated));
                setCurrentUser(updated);
              }catch(err){
                console.error('Erro avatar',err);
              }
            }}
          />
        </div>
      )}
      <div className="chat-header__actions">
        <button
          onClick={()=>{setShowRegistro(true);setRegistroResult(null);}}
          title="Registro Inteligente"
          style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:8,padding:'6px 12px',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:500}}
        >
          <ClipboardList size={15}/><span className="chat-header__quick-label">Registro</span>
        </button>
        <button
          onClick={()=>{setShowCadastrarIa(true);setCadResult(null);}}
          title="Cadastrar com IA"
          style={{background:'transparent',border:'1px solid #3a3a5e',borderRadius:8,padding:'6px 10px',color:'#e5e7eb',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:500}}
        >
          <FileText size={14}/><span className="chat-header__quick-label">Cadastrar com IA</span>
        </button>
        <button
          type="button"
          onClick={() => setProacaoOverlay({ open: true, tab: 'proposals' })}
          title="Pró-Ação — propostas e listas (no chat)"
          style={{background:'transparent',border:'1px solid #3a3a5e',borderRadius:8,padding:'6px 10px',color:'#e5e7eb',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:500}}
        >
          <Target size={14}/><span className="chat-header__quick-label">Pró-Ação</span>
        </button>
        <button
          type="button"
          onClick={() => setProacaoOverlay({ open: true, tab: 'tpm' })}
          title="TPM — Perdas (no chat)"
          style={{background:'transparent',border:'1px solid #3a3a5e',borderRadius:8,padding:'6px 10px',color:'#e5e7eb',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:500}}
        >
          <AlertCircle size={14}/><span className="chat-header__quick-label">TPM perdas</span>
        </button>
      </div>
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
    {showCadastrarIa&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#050711',border:'1px solid #1e293b',borderRadius:18,width:'100%',maxWidth:620,padding:24,display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:'radial-gradient(circle at 0 0,#38bdf8,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Upload size={18} color="#ecfeff"/>
            </div>
            <div>
              <div style={{color:'#e5e7eb',fontWeight:600,fontSize:16}}>Cadastrar com IA</div>
              <div style={{color:'#9ca3af',fontSize:12}}>Envie texto, imagem ou documento sem sair do chat</div>
            </div>
          </div>
          <button onClick={()=>{setShowCadastrarIa(false);setCadResult(null);}} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer'}}><X size={20}/></button>
        </div>
        {cadResult&&(
          <div style={{padding:12,borderRadius:10,background:cadResult.ok?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)',border:`1px solid ${cadResult.ok?'#22c55e':'#ef4444'}`,display:'flex',gap:10}}>
            {cadResult.ok?<CheckCircle size={18} color="#22c55e"/>:<AlertTriangle size={18} color="#ef4444"/>}
            <div style={{color:'#e5e7eb',fontSize:13}}>
              {cadResult.ok ? (cadResult.msg || 'Informação cadastrada com sucesso!') : (cadResult.msg || 'Erro ao cadastrar com IA.')}
            </div>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <label style={{color:'#9ca3af',fontSize:12}}>Texto ou descrição</label>
          <textarea
            value={cadTexto}
            onChange={e=>setCadTexto(e.target.value)}
            placeholder="Descreva o ocorrido, equipamento, processo ou informação que deseja registrar..."
            rows={4}
            style={{background:'#020617',border:'1px solid #1f2937',borderRadius:10,padding:12,color:'#f9fafb',fontSize:14,resize:'vertical',outline:'none'}}
          />
        </div>
        <div style={{display:'flex',gap:10}}>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
            <label style={{color:'#9ca3af',fontSize:12}}>Setor (opcional)</label>
            <input
              value={cadSector}
              onChange={e=>setCadSector(e.target.value)}
              placeholder="Produção, Manutenção..."
              style={{background:'#020617',border:'1px solid #1f2937',borderRadius:8,padding:'8px 10px',color:'#e5e7eb',fontSize:13,outline:'none'}}
            />
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
            <label style={{color:'#9ca3af',fontSize:12}}>Equipamento (opcional)</label>
            <input
              value={cadEquipamento}
              onChange={e=>setCadEquipamento(e.target.value)}
              placeholder="Ex: Compressor linha 4"
              style={{background:'#020617',border:'1px solid #1f2937',borderRadius:8,padding:'8px 10px',color:'#e5e7eb',fontSize:13,outline:'none'}}
            />
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <label style={{color:'#9ca3af',fontSize:12}}>Arquivo (opcional)</label>
          <label style={{display:'inline-flex',alignItems:'center',gap:8,background:'#020617',border:'1px dashed #334155',borderRadius:10,padding:'10px 12px',color:'#9ca3af',fontSize:12,cursor:'pointer'}}>
            <Upload size={16}/> <span>{cadFile ? cadFile.name : 'Selecione PDF, DOC, imagem ou áudio (até 15MB)'}</span>
            <input type="file" style={{display:'none'}} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.m4a,.wav" onChange={e=>setCadFile(e.target.files?.[0] || null)}/>
          </label>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
          <button onClick={()=>{setShowCadastrarIa(false);setCadResult(null);}} style={{padding:'8px 16px',borderRadius:8,background:'#020617',border:'1px solid #1f2937',color:'#9ca3af',fontSize:13,cursor:'pointer'}}>Cancelar</button>
          <button
            onClick={async ()=>{
              if(cadLoading || (!cadTexto.trim() && !cadFile)) return;
              setCadLoading(true); setCadResult(null);
              try{
                const fd=new FormData();
                fd.append('texto', cadTexto.trim());
                if(cadSector) fd.append('sector', cadSector);
                if(cadEquipamento) fd.append('equipamento', cadEquipamento);
                if(cadFile) fd.append('file', cadFile);
                const {data}=await chatApi.cadastrarComIA.cadastrar(fd);
                const ok=data?.ok!==false;
                setCadResult({ok, msg: ok ? 'Informação cadastrada com sucesso!' : (data?.error || 'Erro ao cadastrar com IA')});
                if(ok){ setCadTexto(''); setCadSector(''); setCadEquipamento(''); setCadFile(null); }
              }catch(e){
                setCadResult({ok:false, msg:e?.response?.data?.error || 'Erro ao cadastrar com IA'});
              }finally{
                setCadLoading(false);
              }
            }}
            disabled={cadLoading || (!cadTexto.trim() && !cadFile)}
            style={{padding:'8px 18px',borderRadius:8,background:cadLoading||(!cadTexto.trim()&&!cadFile)?'#1f2937':'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#f9fafb',fontSize:13,fontWeight:500,cursor:cadLoading||(!cadTexto.trim()&&!cadFile)?'not-allowed':'pointer'}}
          >
            {cadLoading ? 'Enviando...' : 'Cadastrar com IA'}
          </button>
        </div>
      </div>
    </div>}
    {proacaoOverlay.open && (
      <div className="chat-proacao-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-proacao-title">
        <div className="chat-proacao-overlay__topbar">
          <button
            type="button"
            className="chat-proacao-overlay__back"
            onClick={() => setProacaoOverlay((o) => ({ ...o, open: false }))}
            aria-label="Voltar ao chat"
          >
            <ArrowLeft size={18} /> <span className="chat-proacao-overlay__back-text">Chat</span>
          </button>
          <h2 id="chat-proacao-title" className="chat-proacao-overlay__title">
            Pró-Ação & TPM
          </h2>
          <button
            type="button"
            className="chat-proacao-overlay__fullpage"
            onClick={() =>
              navigate(proacaoOverlay.tab === 'tpm' ? '/app/proacao?tab=tpm' : '/app/proacao')
            }
          >
            Página completa
          </button>
        </div>
        <div className="chat-proacao-overlay__body">
          <ProacaoWorkspace
            key={proacaoOverlay.tab}
            variant="embedded"
            initialSection={proacaoOverlay.tab}
          />
        </div>
      </div>
    )}
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
            <div className="chat-conv-info">
              <span className="chat-conv-name">{convTitle(activeConv,currentUser&&currentUser.id)}</span>
              <span className="chat-conv-meta">
                {activeConv.type==='group'
                  ? ((activeConv.participants&&activeConv.participants.length||0)+' participantes')
                  : (isOtherOnline ? '🟢 Online' : (lastSeenText ? `Visto por último às ${lastSeenText}` : 'offline'))}
              </span>
            </div>
          </div>
          <MessageArea messages={messages} currentUserId={currentUser&&currentUser.id} loading={loading} hasMore={hasMore} onLoadMore={()=>loadMessages(false)} typingUsers={typingUsers} onDeleteMessage={handleChatDelete}/>
          <MessageInput conversationId={activeId} onSend={handleSend} onTyping={()=>emitTyping(activeId)} onStopTyping={()=>emitStopTyping(activeId)}/>
        </>):(
          <div className="chat-welcome"><img src={chatBrandImg} alt="" style={{width:80,height:80,objectFit:"contain"}}/><h2>IMPETUS Chat</h2><p>Selecione uma conversa ou inicie uma nova</p></div>
        )}
      </div>
    </div>
  </div>);
}
