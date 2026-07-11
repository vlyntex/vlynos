'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteVendorAction } from '../actions';

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/vendors?search=${encodeURIComponent(search)}`);
      setVendors(data.vendors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      alert("Error: Cannot delete because the partner ID is missing.");
      return;
    }
    if (window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      try {
        await deleteVendorAction(id);
        fetchVendors();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const columns = [
    { key: 'code', header: 'Vendor Code', render: (v: any) => <strong>{v.code}</strong> },
    { key: 'name', header: 'Company Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'status',
      header: 'Status',
      render: (v: any) => (
        <Badge variant={v.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {v.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/vendors/${v.id}/edit`)}>
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)} style={{ color: 'red' }}>
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
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Partners</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage external partner organizations and their access.</p>
        </div>
        <Link href="/vendors/new">
          <Button>
            <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Partner
          </Button>
        </Link>
      </div>

      <Card padding="sm">
        <div style={{ maxWidth: '400px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Search partners by name, code, or email..." 
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
        data={vendors} 
        keyExtractor={(v: any) => v.id}
        loading={loading}
        emptyMessage={search ? "No partners found matching your search." : "No partners available."}
      />
    </div>
  );
}
