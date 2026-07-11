'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Activity, Database, FileText, AlertTriangle, ShieldCheck, Settings } from 'lucide-react';

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { href: '/system', label: 'Health', icon: Activity },
    { href: '/system/backups', label: 'Backups', icon: Database },
    { href: '/system/logs', label: 'Logs', icon: FileText },
    { href: '/system/errors', label: 'Errors', icon: AlertTriangle },
    { href: '/system/security', label: 'Security', icon: ShieldCheck },
    { href: '/system/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>System Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monitor health, backups, and security settings.</p>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link 
              key={link.href}
              href={link.href} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                textDecoration: 'none',
                borderBottom: isActive ? '2px solid var(--color-primary-500)' : '2px solid transparent',
                color: isActive ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} /> {link.label}
            </Link>
          );
        })}
      </div>
      
      <div>
        {children}
      </div>
    </div>
  );
}
