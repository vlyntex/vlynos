import React, { useEffect, useState, useRef } from 'react';
import { Send, CheckCircle2, MessageCircle, MoreVertical, UserPlus, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, Chat } from '@/store/chatStore';
import { api } from '@/lib/api';
import { Virtuoso } from 'react-virtuoso';

export function ChatWindow({ 
  currentUser, 
  socket,
  onAddMember, 
  onLeaveChat 
}: { 
  currentUser: any; 
  socket: any;
  onAddMember: () => void;
  onLeaveChat: () => void;
}) {
  const activeChatId = useChatStore(state => state.activeChatId);
  const chats = useChatStore(state => state.chats);
  const activeChat = chats.find(c => c.id === activeChatId) || null;
  const messages = useChatStore(state => state.messages[activeChatId || '']) || [];
  const typingUsers = useChatStore(state => state.typingUsers[activeChatId || '']) || [];
  const addMessage = useChatStore(state => state.addMessage);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);

  const virtuosoRef = useRef<any>(null);

  // Capture unread count when chat is opened
  useEffect(() => {
    if (activeChatId && activeChat) {
      setInitialUnreadCount(activeChat.unreadCount || 0);
    }
  }, [activeChatId]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (activeChatId) {
      api.post(`/chat/${activeChatId}/read`, {}).catch(console.error);
    }
  }, [activeChatId, messages.length]);

  const handleScroll = (e: any) => {
    // If not at bottom, show the floating 'Scroll to Bottom / New Messages' button
    if (e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight > 200) {
      setShowScrollToBottom(true);
    } else {
      setShowScrollToBottom(false);
    }
  };

  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' });
    setShowScrollToBottom(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || isSending) return;
    
    const text = inputText;
    setInputText('');
    setIsSending(true);
    
    const tempId = 'temp-' + Date.now();
    addMessage(activeChat.id, {
      id: tempId,
      chatId: activeChat.id,
      senderId: currentUser?.id,
      message: text,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      sender: { firstName: currentUser?.firstName, lastName: currentUser?.lastName, employeeId: currentUser?.employeeId }
    });
    
    setTimeout(scrollToBottom, 100);
    
    // Optimistically update the sidebar
    useChatStore.getState().updateChat(activeChat.id, {
      lastMessageText: text,
      updatedAt: new Date().toISOString()
    });
    
    try {
      await api.post(`/chat/${activeChat.id}/messages`, { message: text });
    } catch (err) {
      console.error('Failed to send message', err);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  if (!activeChat) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <MessageCircle size={48} color="#cbd5e1" />
        </div>
        <h3 style={{ color: '#334155', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>Your Messages</h3>
        <p style={{ margin: 0, fontSize: '1.1rem' }}>Select a conversation to start chatting</p>
      </div>
    );
  }

  const isTyping = typingUsers.length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255, 255, 255, 0.6)', backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '44px', height: '44px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {activeChat.name?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a' }}>{activeChat.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, letterSpacing: '0.5px' }}>{activeChat.type} CHAT</span>
            </div>
          </div>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#64748b' }}
          >
            <MoreVertical size={20} />
          </button>
          {showDropdown && (
            <div style={{ position: 'absolute', right: 0, top: '40px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '150px', zIndex: 20 }}>
              {activeChat.type === 'GROUP' && (
                <button 
                  onClick={() => { setShowDropdown(false); onAddMember(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: '#334155' }}
                >
                  <UserPlus size={16} /> Add Member
                </button>
              )}
              <button onClick={() => { setShowDropdown(false); onLeaveChat(); }} style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: '#64748b' }}>
                Leave Chat
              </button>
              <button onClick={() => { setShowDropdown(false); alert('Delete chat not implemented'); }} style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: '#ef4444', borderTop: '1px solid #f1f5f9' }}>
                Delete Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <MessageCircle size={36} color="#cbd5e1" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>It's quiet here...</h3>
            <p style={{ margin: 0 }}>Be the first to send a message!</p>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            onScroll={handleScroll}
            initialTopMostItemIndex={Math.max(0, messages.length - 1)}
            style={{ height: '100%' }}
            itemContent={(index, msg) => {
              const isMe = currentUser?.id === msg.senderId;
              const isTemp = msg.id.startsWith('temp-');
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId || (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000);
              const isFirstUnread = initialUnreadCount > 0 && index === messages.length - initialUnreadCount;

              return (
                <div style={{ padding: '0.5rem 2rem' }}>
                  {isFirstUnread && (
                    <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', gap: '1rem' }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-500)', backgroundColor: 'var(--color-primary-50)', padding: '0.25rem 0.75rem', borderRadius: '12px' }}>
                        {initialUnreadCount} UNREAD MESSAGE{initialUnreadCount > 1 ? 'S' : ''}
                      </div>
                      <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '65%' }}>
                    {showHeader && !isMe && (
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </div>
                    )}
                    <div style={{ 
                      padding: '0.875rem 1.25rem', 
                      borderRadius: '16px',
                      backgroundColor: isMe ? '#0ea5e9' : 'white',
                      color: isMe ? 'white' : '#1e293b',
                      boxShadow: isMe ? '0 4px 12px rgba(14,165,233,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                      borderBottomRightRadius: isMe ? '4px' : '16px',
                      borderBottomLeftRadius: !isMe ? '4px' : '16px',
                      border: isMe ? 'none' : '1px solid #f1f5f9',
                      opacity: isTemp ? 0.7 : 1,
                    }}>
                      <div style={{ fontSize: '0.95rem', lineHeight: '1.5', wordBreak: 'break-word' }}>{msg.message}</div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '4px',
                        marginTop: '6px',
                        fontSize: '0.7rem', 
                        color: isMe ? 'rgba(255,255,255,0.8)' : '#94a3b8' 
                      }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && !isTemp && (
                          <CheckCircle2 size={12} color={msg.status === 'READ' ? '#fbbf24' : 'inherit'} /> // Yellow checkmark when read
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              );
            }}
          />
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{ position: 'absolute', bottom: '10px', left: '2rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}
            >
              <div style={{ padding: '8px 12px', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', gap: '4px' }}>
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }} style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%' }} />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2, ease: 'easeInOut' }} style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%' }} />
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4, ease: 'easeInOut' }} style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%' }} />
              </div>
              <span>Someone is typing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Scroll to Bottom / Unread Chip */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              onClick={scrollToBottom}
              style={{
                position: 'absolute', bottom: '30px', right: '30px',
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: 'white', color: '#0ea5e9',
                border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10
              }}
            >
              <ArrowDown size={20} />
              {/* Optional: Add small unread badge here if we track unread below fold */}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      {!(activeChat.type === 'ANNOUNCEMENT' && currentUser?.role !== 'MANAGEMENT') ? (
        <div style={{ padding: '1.25rem 2rem', backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255, 255, 255, 0.6)', zIndex: 5 }}>
          <form onSubmit={(e) => {
            if (socket && activeChat) socket.emit('typing_end', { chatId: activeChat.id });
            sendMessage(e);
          }} style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: '0.5rem', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <input 
              type="text" 
              value={inputText} 
              onChange={e => {
                setInputText(e.target.value);
                if (socket && activeChat) {
                  socket.emit('typing_start', { chatId: activeChat.id });
                  // Debounce typing_end
                  if ((window as any).typingTimeout) clearTimeout((window as any).typingTimeout);
                  (window as any).typingTimeout = setTimeout(() => {
                    socket.emit('typing_end', { chatId: activeChat.id });
                  }, 2000);
                }
              }} 
              placeholder="Type your message..."
              style={{ flex: 1, padding: '0.75rem 1.25rem', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '0.95rem', color: '#1e293b' }}
            />
            <button type="submit" disabled={!inputText.trim() || isSending} style={{ 
              backgroundColor: inputText.trim() ? '#0ea5e9' : '#cbd5e1', 
              color: 'white', border: 'none', width: '46px', height: '46px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              boxShadow: inputText.trim() ? '0 4px 10px rgba(14,165,233,0.3)' : 'none',
              transition: 'all 0.2s'
            }}>
              <Send size={18} style={{ marginLeft: '-2px' }} />
            </button>
          </form>
        </div>
      ) : (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', fontWeight: 500 }}>
          Only Management can post in Announcements.
        </div>
      )}
    </div>
  );
}
