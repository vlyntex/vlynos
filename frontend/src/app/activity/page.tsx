'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Search, Filter, Calendar } from 'lucide-react';

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [filters, setFilters] = useState({ action: '', entityType: '', date: '', searchUser: '' });
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const data = await api.get(`/activity?${query}`);
      setActivities(data.activities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivity();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const columns = [
    {
      key: 'actor',
      header: 'Actor',
      render: (act: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Avatar fallback={act.actor?.firstName?.substring(0, 2) || 'UK'} size="sm" />
          <div>
            <div style={{ fontWeight: 600 }}>{act.actor?.firstName} {act.actor?.lastName}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{act.actor?.role}</div>
          </div>
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      render: (act: any) => <Badge variant="neutral">{act.action}</Badge>
    },
    {
      key: 'entity',
      header: 'Target Entity',
      render: (act: any) => (
        <div>
          <span style={{ fontWeight: 500 }}>{act.entityType}</span>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{act.entityId.substring(0, 8)}...</div>
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      render: (act: any) => (
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          {new Date(act.createdAt).toLocaleString(undefined, { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          })}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Activity Log</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track all system events and user actions.</p>
      </div>

      <Card padding="sm" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Search by user name..." 
            value={filters.searchUser} 
            onChange={e => updateFilter('searchUser', e.target.value)}
            style={{ 
              width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', 
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)',
              fontFamily: 'inherit', fontSize: 'var(--text-sm)'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-main)', padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Action (e.g. LOGIN)" 
              value={filters.action} 
              onChange={e => updateFilter('action', e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '120px', fontSize: 'var(--text-sm)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-main)', padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Entity (e.g. TASK)" 
              value={filters.entityType} 
              onChange={e => updateFilter('entityType', e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '120px', fontSize: 'var(--text-sm)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-main)', padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <input 
              type="date" 
              value={filters.date} 
              onChange={e => updateFilter('date', e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </Card>

      <Table 
        columns={columns} 
        data={activities} 
        keyExtractor={(act: any) => act.id}
        loading={loading}
        emptyMessage="No activity logs match your filters."
      />
    </div>
  );
}
