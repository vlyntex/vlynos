'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function EditWorkerPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', vendorId: '', status: '' });
  const [vendors, setVendors] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    Promise.all([
      api.get(`/workers/${params.id}`),
      api.get('/auth/me')
    ]).then(([workerRes, authRes]) => {
      setForm({ 
        firstName: workerRes.worker.firstName, 
        lastName: workerRes.worker.lastName, 
        vendorId: workerRes.worker.vendorId,
        status: workerRes.worker.accountStatus
      });
      setProfile(authRes.user);

      if (authRes.user.role === 'MANAGEMENT') {
        api.get('/vendors').then(v => setVendors(v.vendors)).catch(console.error);
      }
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/workers/${params.id}`, { firstName: form.firstName, lastName: form.lastName, vendorId: form.vendorId });
      if (form.status) {
        await api.patch(`/workers/${params.id}/status`, { status: form.status });
      }
      router.push('/workers');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ color: '#111' }}>
      <h1>Edit Developer</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', marginTop: '1rem' }}>
        <label>
          First Name
          <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={{ padding: '0.5rem', width: '100%', marginTop: '0.25rem' }} />
        </label>
        
        <label>
          Last Name
          <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={{ padding: '0.5rem', width: '100%', marginTop: '0.25rem' }} />
        </label>

        {profile?.role === 'MANAGEMENT' && (
          <label>
            Partner
            <select required value={form.vendorId} onChange={e => setForm({...form, vendorId: e.target.value})} style={{ padding: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
              <option value="">Select Partner</option>
              {vendors.map((v: any) => (
                <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
              ))}
            </select>
          </label>
        )}

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
