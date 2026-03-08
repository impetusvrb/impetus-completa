import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationList from './components/ConversationList';
import MessageArea from './components/MessageArea';
import MessageInput from './components/MessageInput';
import { useChatSocket } from './hooks/useChatSocket';
import { useMessages } from './hooks/useMessages';
import chatApi from './services/chatApi';
import { User, ArrowLeft, Menu } from 'lucide-react';
import './styles/chat.css';

function convTitle(c,uid){ if(!c) return 'Chat'; if(c.type==='group') return c.name||'Grupo'; const o=c.participants&&c.participants.find(p=>p.id!==uid); return o&&(o.name||o.email)||'Conversa'; }

export default function ChatApp(){
  const [conversations,setConversations]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [onlineUsers,setOnlineUsers]=useState(new Set());
  const [typingUsers,setTypingUsers]=useState([]);
  const [sidebarOpen,setSidebarOpen]=useState(true);
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

  const otherParticipant=activeConv&&activeConv.participants&&currentUser&&activeConv.participants.find(p=>p.id!==currentUser.id);
  const isOtherOnline=otherParticipant&&onlineUsers.has(otherParticipant.id);

  return (<div className="chat-app">
    <div className="chat-header">
      <button className="btn-icon chat-menu-btn" onClick={()=>setSidebarOpen(v=>!v)}><Menu size={20}/></button>
      <div className="chat-header__brand"><img src="/icons/chat-icon-192.png" style={{width:28,height:28,borderRadius:"50%",objectFit:"cover"}}/><span>IMPETUS Chat</span></div>
      {currentUser&&<div className="chat-header__user"><User size={14}/><span>{currentUser.name||currentUser.email}</span></div>}
    </div>
    <div className="chat-body">
      <div className={'chat-sidebar'+(sidebarOpen?' open':' closed')}>
        <ConversationList conversations={conversations} activeId={activeId} onSelect={selectConv} currentUserId={currentUser&&currentUser.id} onlineUsers={onlineUsers} onRefresh={loadConversations}/>
      </div>
      <div className="chat-main">
        {activeConv?(<>
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
