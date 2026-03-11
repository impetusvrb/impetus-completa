import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationList from './components/ConversationList';
import MessageArea from './components/MessageArea';
import MessageInput from './components/MessageInput';
import { useChatSocket } from './hooks/useChatSocket';
import { useMessages } from './hooks/useMessages';
import chatApi from './services/chatApi';
import { User, ArrowLeft, Menu, Bot, Send, ClipboardList, X, CheckCircle, AlertTriangle } from 'lucide-react';
import './styles/chat.css';

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
  const typingTimers=useRef({});
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

  const {sendMessage,emitTyping,emitStopTyping,markRead,joinConversation}=useChatSocket({onMessage,onTyping,onStopTyping,onOnline,onOffline});

  async function selectConv(id){ await loadConversations(); setActiveId(id); joinConversation(id); markRead(id); if(window.innerWidth<768) setSidebarOpen(false); }
  async function handleSend({type,content}){ if(!activeId) return; try{ await sendMessage({conversationId:activeId,content,type}); }catch(e){ console.error(e); } }

  async function handleAiSend(){
    if(!aiInput.trim()||aiLoading) return;
    const text=aiInput.trim(); setAiInput(''); setAiLoading(true);
    const userMsg={id:Date.now(),content:text,isUser:true,created_at:new Date().toISOString()};
    setAiMessages(prev=>[...prev,userMsg]);
    try{
      const hist=[...aiMessages,userMsg].map(m=>({role:m.isUser?'user':'assistant',content:m.content}));
      const {data}=await chatApi.sendAIMessage(hist);
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
  const isOtherOnline=otherParticipant&&onlineUsers.has(otherParticipant.id);

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
              <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={16} color="#fff"/></div>
              <div><span className="chat-conv-name">Impetus IA</span><br/><span style={{color:'#22c55e',fontSize:11}}>online</span></div>
            </div>
          </div>
          <div className="msg-area" style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
            {aiMessages.map(msg=>(<div key={msg.id} style={{display:'flex',justifyContent:msg.isUser?'flex-end':'flex-start',gap:8,alignItems:'flex-end'}}>
              {!msg.isUser&&<div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Bot size={14} color="#fff"/></div>}
              <div style={{maxWidth:'72%',padding:'10px 14px',borderRadius:msg.isUser?'18px 18px 4px 18px':'18px 18px 18px 4px',background:msg.isUser?'#6366f1':'#1e1e2e',color:'#fff',fontSize:14,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{msg.content}<div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:4,textAlign:'right'}}>{new Date(msg.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div></div>
            </div>))}
            {aiLoading&&<div style={{display:'flex',gap:8}}><div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center'}}><Bot size={14} color="#fff"/></div><div style={{padding:'10px 14px',borderRadius:'18px 18px 18px 4px',background:'#1e1e2e',color:'#a0a0b0',fontSize:14}}>Digitando...</div></div>}
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
              <span className="chat-conv-meta">{activeConv.type==='group'?((activeConv.participants&&activeConv.participants.length||0)+' participantes'):(isOtherOnline?'online':'offline')}</span>
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
