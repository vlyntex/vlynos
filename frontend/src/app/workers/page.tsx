'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteDeveloperAction } from '../actions';

import { io, Socket } from 'socket.io-client';

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me').then(res => setProfile(res.user)).catch(console.error);
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/workers?search=${encodeURIComponent(search)}`);
      setWorkers(data.workers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      alert("Error: Cannot delete because the developer ID is missing.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this developer? This action cannot be undone.')) {
      const result = await deleteDeveloperAction(id);
      if (result.success) {
        fetchWorkers();
      } else {
        alert(result.message);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const newSocket = io({ withCredentials: true, path: '/socket.io' });

    newSocket.on('user_status_changed', (data: { userId: string, status: string }) => {
      setWorkers(prev => prev.map((w: any) => 
        w.id === data.userId ? { ...w, isOnline: data.status === 'ONLINE' } : w
      ));
    });

    return () => { newSocket.close(); };
  }, []);

  const columns = [
    { key: 'employeeId', header: 'Emp ID', render: (w: any) => <strong>{w.employeeId}</strong> },
    { key: 'name', header: 'Name', render: (w: any) => `${w.firstName} ${w.lastName}` },
    { key: 'email', header: 'Email' },
    { key: 'vendor', header: 'Vendor', render: (w: any) => `${w.vendor?.name} (${w.vendor?.code})` },
    {
      key: 'status',
      header: 'Status',
      render: (w: any) => (
        <Badge variant={w.isOnline ? 'success' : 'neutral'}>
          {w.isOnline ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (w: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/workers/${w.id}/edit`)}>
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)} style={{ color: 'red' }}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Developers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your developer workforce and track their status.</p>
        </div>
        {(profile?.role === 'MANAGEMENT' || profile?.role === 'VENDOR') && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/workers/bulk">
              <Button variant="outline">
                Bulk Add
              </Button>
            </Link>
            <Link href="/workers/new">
              <Button>
                <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Developer
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Card padding="sm">
        <div style={{ maxWidth: '400px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Search developers by name, email, or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', 
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)',
              fontFamily: 'inherit', fontSize: 'var(--text-sm)'
            }}
          />
        </div>
      </Card>

      <Table 
        columns={columns} 
        data={workers} 
        keyExtractor={(w: any) => w.id}
        loading={loading}
        emptyMessage={search ? "No developers found matching your search." : "No developers available."}
      />
    </div>
  );
}
