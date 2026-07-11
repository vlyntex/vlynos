'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Bell, BellRing, Check, CheckCheck, Search } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/notifications?search=${encodeURIComponent(search)}`);
      setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Notifications {unreadCount > 0 && <Badge variant="danger">{unreadCount} unread</Badge>}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>Stay updated on tasks and system events.</p>
        </div>
        <Button onClick={markAllRead} variant="outline" disabled={unreadCount === 0 || notifications.length === 0}>
          <Check size={16} style={{ marginRight: '0.5rem' }} /> Mark All Read
        </Button>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input 
          type="text" 
          placeholder="Search notifications..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={{ 
            width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', 
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)',
            fontFamily: 'inherit', fontSize: 'var(--text-sm)',
            backgroundColor: 'var(--bg-surface)'
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} elevated style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="skeleton" style={{ width: '100%', height: '100%' }} />
            </Card>
          ))
        ) : notifications.length === 0 ? (
          <EmptyState 
            icon={<Bell size={24} />} 
            title="All caught up" 
            description={search ? "No notifications match your search." : "You don't have any notifications right now."}
          />
        ) : (
          notifications.map(notif => (
            <Card 
              key={notif.id} 
              style={{ 
                display: 'flex', 
                gap: '1rem',
                borderLeft: notif.isRead ? 'none' : '4px solid var(--color-primary-500)',
                backgroundColor: notif.isRead ? 'var(--bg-surface)' : 'var(--color-primary-50)',
                opacity: notif.isRead ? 0.7 : 1,
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ 
                backgroundColor: notif.isRead ? 'var(--bg-surface-hover)' : 'var(--bg-main)', 
                width: '40px', height: '40px', 
                borderRadius: 'var(--radius-full)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: notif.isRead ? 'var(--text-tertiary)' : 'var(--color-primary-600)'
              }}>
                {notif.isRead ? <Bell size={18} /> : <BellRing size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {notif.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(notif.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: '0.5rem' }}>
                  {notif.message}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge size="sm" variant="neutral">{notif.type}</Badge>
                  {!notif.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(notif.id)} style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem' }}>
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
