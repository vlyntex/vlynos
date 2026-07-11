'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { X, Bell } from 'lucide-react';
import styles from './LiveNotifications.module.css';
import { cn } from '@/lib/utils';

export default function LiveNotifications() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const socket = io({ withCredentials: true, path: '/socket.io' });
    
    socket.on('new_notification', (notif) => {
      setToasts(prev => [...prev, notif]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notif.id));
      }, 5000);
    });

    return () => {
      socket.close();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map(toast => (
        <div key={toast.id} className={styles.toast}>
          <div className={styles.iconWrapper}>
            <Bell size={18} />
          </div>
          <div className={styles.content}>
            <strong className={styles.title}>{toast.title}</strong>
            <span className={styles.message}>{toast.message}</span>
          </div>
          <button 
            className={styles.closeBtn} 
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
