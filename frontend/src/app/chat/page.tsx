'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '@/store/chatStore';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useNativeNotification } from '@/hooks/useNativeNotification';

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setChats = useChatStore(state => state.setChats);
  const updateChat = useChatStore(state => state.updateChat);
  const activeChatId = useChatStore(state => state.activeChatId);
  const setActiveChatId = useChatStore(state => state.setActiveChatId);
  const addMessage = useChatStore(state => state.addMessage);
  const setMessages = useChatStore(state => state.setMessages);
  const setTyping = useChatStore(state => state.setTyping);

  const { showNotification, startTabBlink, stopTabBlink } = useNativeNotification();
  const activeChatIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<any>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
    if (activeChatId) {
      stopTabBlink();
      
      if (socket) {
        socket.emit('join_chat', activeChatId);
      }
      
      // Fetch messages for active chat
      api.get(`/chat/${activeChatId}/messages?page=1`)
        .then(data => {
          setMessages(activeChatId, data.messages || []);
          // Clear unread count optimistically
          updateChat(activeChatId, { unreadCount: 0 });
        })
        .catch(console.error);
    }
  }, [activeChatId, socket]);

  useEffect(() => {
    api.get('/auth/me').then(d => {
      setCurrentUser(d.user);
      currentUserRef.current = d.user;
    }).catch(console.error);

    const fetchChats = () => {
      api.get('/chat').then(data => {
        setChats(data.chats || []);
      }).catch(console.error);
    };

    fetchChats();

    const socketUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:4000' 
      : '';
    const newSocket = io(socketUrl, { path: '/socket.io', withCredentials: true });
    setSocket(newSocket);

    newSocket.on('new_message', (msg) => {
      useChatStore.getState().addMessage(msg.chatId, msg);
      
      const chats = useChatStore.getState().chats;
      const chat = chats.find(c => c.id === msg.chatId);
      
      // Notify and blink if not in active chat
      if (activeChatIdRef.current !== msg.chatId) {
        if (msg.senderId !== currentUserRef.current?.id) {
          startTabBlink('New Message!');
          
          if (chat) {
            useChatStore.getState().updateChat(msg.chatId, {
              unreadCount: (chat.unreadCount || 0) + 1,
              lastMessageText: msg.message,
              updatedAt: msg.createdAt
            });
          }
          
          showNotification(
            `Message from ${msg.sender?.firstName || 'Someone'}`, 
            msg.message, 
            () => useChatStore.getState().setActiveChatId(msg.chatId)
          );
        } else {
          // If we sent it (e.g. from another tab), just update the text
          if (chat) {
            useChatStore.getState().updateChat(msg.chatId, {
              lastMessageText: msg.message,
              updatedAt: msg.createdAt
            });
          }
        }
      } else {
        // We are looking at it, mark it as read on the backend
        if (chat) {
          useChatStore.getState().updateChat(msg.chatId, {
            lastMessageText: msg.message,
            updatedAt: msg.createdAt
          });
        }
        api.post(`/chat/${msg.chatId}/read`, {}).catch(console.error);
      }
    });

    newSocket.on('messages_read', (data) => {
      // Ignore to prevent overwriting local state
    });

    newSocket.on('typing_start', (data) => {
      setTyping(data.chatId, data.userId, true);
    });

    newSocket.on('typing_end', (data) => {
      setTyping(data.chatId, data.userId, false);
    });

    // Re-fetch occasionally as a fallback
    const interval = setInterval(() => {
      fetchChats();
    }, 10000);

    return () => {
      newSocket.close();
      clearInterval(interval);
    };
  }, []);

  // Modal logic (Create DM, Create Group)
  const handleCreateDM = async (otherUserId: string) => {
    try {
      setIsSubmitting(true);
      const data = await api.post('/chat/direct', { otherUserId });
      setShowNewChatModal(false);
      setUserSearchQuery('');
      if (data.chat) {
        // refetch to get clean chat object
        api.get('/chat').then(d => {
          setChats(d.chats || []);
          setActiveChatId(data.chat.id);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName || selectedUsers.length === 0) return;
    try {
      setIsSubmitting(true);
      const data = await api.post('/chat/group', { name: groupName, userIds: selectedUsers.map(u => u.id) });
      setShowGroupModal(false);
      setGroupName('');
      setSelectedUsers([]);
      setUserSearchQuery('');
      if (data.chat) {
        api.get('/chat').then(d => {
          setChats(d.chats || []);
          setActiveChatId(data.chat.id);
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0 || !activeChatId) return;
    try {
      setIsSubmitting(true);
      await api.post(`/chat/group/${activeChatId}/members`, { userIds: selectedUsers.map(u => u.id) });
      setShowAddMemberModal(false);
      setSelectedUsers([]);
      setUserSearchQuery('');
      alert('Members added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (userSearchQuery.length >= 2) {
      const delay = setTimeout(() => {
        api.get(`/chat/users?search=${encodeURIComponent(userSearchQuery)}`)
          .then(data => setUserSearchResults(data.users || []))
          .catch(console.error);
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setUserSearchResults([]);
    }
  }, [userSearchQuery]);

  const toggleUserSelection = (user: any) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) return prev.filter(u => u.id !== user.id);
      return [...prev, user];
    });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', backgroundColor: 'transparent', fontFamily: 'Inter, sans-serif' }}>
      <ChatSidebar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewChat={() => { setShowNewChatModal(true); setUserSearchQuery(''); }}
        onNewGroup={() => { setShowGroupModal(true); setGroupName(''); setSelectedUsers([]); setUserSearchQuery(''); }}
        currentUser={currentUser}
      />
      <ChatWindow 
        currentUser={currentUser}
        socket={socket}
        onAddMember={() => { setShowAddMemberModal(true); setSelectedUsers([]); setUserSearchQuery(''); }}
        onLeaveChat={() => { alert('Not implemented'); }}
      />
      
      {/* Modals */}
      {(showNewChatModal || showGroupModal || showAddMemberModal) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '400px', maxWidth: '90%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>
              {showNewChatModal && 'New Direct Message'}
              {showGroupModal && 'Create New Group'}
              {showAddMemberModal && 'Add Members to Group'}
            </h3>
            
            {showGroupModal && (
              <input 
                type="text" 
                placeholder="Group Name" 
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            )}
            
            <input 
              type="text" 
              placeholder="Search users to add..." 
              value={userSearchQuery}
              onChange={e => setUserSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            
            {(showGroupModal || showAddMemberModal) && selectedUsers.length > 0 && (
              <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedUsers.map(u => (
                  <div key={u.id} style={{ background: '#e0f2fe', padding: '4px 8px', borderRadius: '16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {u.firstName} {u.lastName}
                    <button onClick={() => toggleUserSelection(u)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0369a1', fontWeight: 'bold' }}>&times;</button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
              {userSearchResults.map(user => (
                <div key={user.id} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{user.firstName} {user.lastName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.role} {user.vendor?.name ? `(${user.vendor.name})` : ''}</div>
                  </div>
                  {showNewChatModal ? (
                    <button onClick={() => handleCreateDM(user.id)} disabled={isSubmitting} style={{ padding: '6px 12px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      Message
                    </button>
                  ) : (
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.some(u => u.id === user.id)}
                      onChange={() => toggleUserSelection(user)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                </div>
              ))}
              {userSearchQuery.length >= 2 && userSearchResults.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No users found</div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowNewChatModal(false);
                  setShowGroupModal(false);
                  setShowAddMemberModal(false);
                }}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              {showGroupModal && (
                <button 
                  onClick={handleCreateGroup}
                  disabled={isSubmitting || !groupName || selectedUsers.length === 0}
                  style={{ padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, opacity: (isSubmitting || !groupName || selectedUsers.length === 0) ? 0.5 : 1 }}
                >
                  Create
                </button>
              )}
              {showAddMemberModal && (
                <button 
                  onClick={handleAddMembers}
                  disabled={isSubmitting || selectedUsers.length === 0}
                  style={{ padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, opacity: (isSubmitting || selectedUsers.length === 0) ? 0.5 : 1 }}
                >
                  Add Members
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
