import { useEffect, useRef } from 'react';

export function useNativeNotification() {
  const originalTitle = useRef(typeof window !== 'undefined' ? document.title : '');
  const blinkInterval = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const showNotification = (title: string, body: string, onClick?: () => void) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notification.close();
      };
    }
  };

  const startTabBlink = (text: string) => {
    if (typeof window === 'undefined') return;
    if (document.visibilityState === 'visible') return;

    let showAlt = false;
    if (blinkInterval.current) clearInterval(blinkInterval.current);
    
    blinkInterval.current = setInterval(() => {
      document.title = showAlt ? text : originalTitle.current;
      showAlt = !showAlt;
    }, 1000);
  };

  const stopTabBlink = () => {
    if (typeof window === 'undefined') return;
    if (blinkInterval.current) {
      clearInterval(blinkInterval.current);
      blinkInterval.current = null;
    }
    document.title = originalTitle.current;
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        stopTabBlink();
      }
    };
    
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  return { showNotification, startTabBlink, stopTabBlink };
}
