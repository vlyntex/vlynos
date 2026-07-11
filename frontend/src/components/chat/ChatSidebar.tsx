import React, { useState } from 'react';
import { Search, Plus, Users, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, Chat } from '@/store/chatStore';

export function ChatSidebar({ 
  searchQuery, 
  setSearchQuery, 
  onNewChat, 
  onNewGroup, 
  currentUser 
}: { 
  searchQuery: string; 
  setSearchQuery: (s: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  currentUser: any;
}) {
  const chats = useChatStore(state => state.chats);
  const activeChatId = useChatStore(state => state.activeChatId);
  const setActiveChatId = useChatStore(state => state.setActiveChatId);

  const filteredChats = chats
    .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.unreadCount > 0 && !(b.unreadCount > 0)) return -1;
      if (!(a.unreadCount > 0) && b.unreadCount > 0) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div style={{ width: '340px', backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255, 255, 255, 0.6)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Chats</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onNewChat} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} />
            </button>
            {currentUser && currentUser.role !== 'WORKER' && (
              <button onClick={onNewGroup} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={18} />
              </button>
            )}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.8)', outline: 'none', backgroundColor: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', color: '#334155', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
          />
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        <AnimatePresence>
          {filteredChats.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '3rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
              <MessageCircle size={40} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No conversations found</p>
            </motion.div>
          ) : (
            filteredChats.map(chat => (
              <ChatRow key={chat.id} chat={chat} isActive={activeChatId === chat.id} onClick={() => setActiveChatId(chat.id)} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChatRow({ chat, isActive, onClick }: { chat: Chat, isActive: boolean, onClick: () => void }) {
  const typingUsers = useChatStore(state => state.typingUsers[chat.id]) || [];
  const isTyping = typingUsers.length > 0;
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      style={{ 
        position: 'relative',
        padding: '1rem', 
        margin: '0.25rem 0',
        borderRadius: '12px',
        cursor: 'pointer',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.6)' : 'transparent',
        border: isActive ? '1px solid rgba(255, 255, 255, 0.8)' : '1px solid transparent',
        boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        transition: 'background-color 0.2s, border 0.2s'
      }}
    >
      {/* Animated unread left indicator */}
      <AnimatePresence>
        {chat.unreadCount > 0 && !isActive && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 4, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{
              position: 'absolute',
              left: 0, top: '15%', bottom: '15%',
              backgroundColor: 'var(--color-primary-500)',
              borderTopRightRadius: '4px',
              borderBottomRightRadius: '4px'
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ 
        width: '48px', height: '48px', borderRadius: '50%', 
        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
        boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.2)',
        flexShrink: 0
      }}>
        {chat.name?.substring(0, 2).toUpperCase()}
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: chat.unreadCount > 0 ? 800 : 500, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {chat.name}
          </h4>
          
          <AnimatePresence>
            {chat.unreadCount > 0 && (
              <motion.span 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 20 } }}
                exit={{ scale: 0, opacity: 0 }}
                style={{ 
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'white', 
                  fontSize: '0.75rem', 
                  minWidth: '22px', 
                  height: '22px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: '11px', 
                  fontWeight: 'bold', 
                  padding: '0 6px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}
              >
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        
        <p style={{ margin: 0, fontSize: '0.85rem', color: chat.unreadCount > 0 ? '#000' : (isActive ? '#0284c7' : '#64748b'), fontWeight: chat.unreadCount > 0 ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isTyping ? (
            <span style={{ color: '#10b981', fontWeight: 500, fontStyle: 'italic' }}>Typing...</span>
          ) : (
            chat.lastMessageText || chat.type
          )}
        </p>
      </div>
    </motion.div>
  );
}
