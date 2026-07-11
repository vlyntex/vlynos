'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function EditVendorPage() {
  const [form, setForm] = useState({ name: '', status: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    api.get(`/vendors/${params.id}`)
      .then(res => {
        setForm({ name: res.vendor.name, status: res.vendor.status });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/vendors/${params.id}`, form);
      router.push('/vendors');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ color: '#111' }}>
      <h1>Edit Partner</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', marginTop: '1rem' }}>
        <label>
          Partner Name
          <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ padding: '0.5rem', width: '100%', marginTop: '0.25rem' }} />
        </label>
        
        <label>
          Status
          <select required value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ padding: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </label>

        <Button type="submit">Save Changes</Button>
      </form>
    </div>
  );
}
