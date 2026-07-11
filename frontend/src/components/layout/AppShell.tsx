'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { 
  Menu, X, Bell, Search, LayoutDashboard, Users, UserSquare2, 
  CheckSquare, FileBarChart, MessageSquare, Activity, Settings, Sun, Moon, Book, LogOut
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AppShell.module.css';

const getNavItems = (role?: string) => {
  const items = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  ];
  
  if (role === 'MANAGEMENT') {
    items.push({ name: 'Partners', href: '/vendors', icon: Users });
  }
  
  if (role === 'MANAGEMENT' || role === 'VENDOR') {
    items.push({ name: 'Developers', href: '/workers', icon: UserSquare2 });
    items.push({ name: 'Reports', href: '/reports', icon: FileBarChart });
  }
  
  items.push({ name: 'Chat', href: '/chat', icon: MessageSquare });
  items.push({ name: 'Handbook', href: '/handbook', icon: Book });
  
  if (role === 'MANAGEMENT') {
    items.push({ name: 'Activity', href: '/activity', icon: Activity });
    items.push({ name: 'System', href: '/system', icon: Settings });
  }
  
  return items;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (pathname !== '/login') {
      api.get('/auth/me')
        .then(data => setProfile(data.user))
        .catch((err: any) => {
          console.error(err);
          if (err.status === 401 || err.status === 403) {
            window.location.href = '/login?clear=true';
          }
        });
    }
  }, [pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      console.error('Logout failed', e);
    }
    // Attempt to clear any client-side cookies just in case
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const navItems = getNavItems(profile?.role);
  const userInitials = profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() : 'U';

  return (
    <div className={styles.appShell}>
      {/* Skip to Content for Accessibility */}
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(styles.sidebar, isSidebarOpen && styles.sidebarOpen)}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoText}>
              <span style={{ color: '#f97316' }}>Vlyn</span><span style={{ color: '#000000' }}>Tech</span>
            </span>
          </div>
          <button className={styles.closeBtn} onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                key={item.name}
              >
                <Link 
                  href={item.href}
                  className={cn(styles.navItem, isActive && styles.navItemActive)}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon size={20} className={styles.navIcon} />
                  <span>{item.name}</span>
                </Link>
              </motion.div>
            );
          })}
          
          <div style={{ flex: 1 }} />
          
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: navItems.length * 0.05 + 0.1, duration: 0.3 }}
            onClick={handleLogout}
            className={styles.navItem}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              width: '100%', 
              textAlign: 'left',
              marginTop: 'auto',
              color: 'var(--danger)'
            }}
          >
            <LogOut size={20} className={styles.navIcon} />
            <span style={{ fontWeight: 600 }}>Logout</span>
          </motion.button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
          
          <div className={styles.headerRight}>
            <Link href="/notifications" className={styles.iconBtn}>
              <Bell size={20} />
            </Link>
            <div className={styles.profileMenu}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {profile ? `${profile.firstName} ${profile.lastName}` : 'Loading...'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className={styles.mainContent}>
          <motion.div 
            key={pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={styles.contentContainer}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
