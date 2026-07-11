'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewWorkerPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', vendorId: '' });
  const [vendors, setVendors] = useState([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    api.get('/auth/me')
      .then(data => {
        setProfile(data.user);
        if (data.user.role === 'MANAGEMENT') {
          api.get('/vendors').then(v => setVendors(v.vendors)).catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/workers', form);
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (result) {
    return (
      <div style={{ color: '#111' }}>
        <h1>Developer Created Successfully</h1>
        <p><strong>Employee ID:</strong> {result.worker.employeeId}</p>
        <p><strong>Temporary Password:</strong> {result.tempPassword}</p>
        <p style={{ color: 'red' }}>Please save this password now. It will not be shown again.</p>
        <button onClick={() => router.push('/workers')} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back to Developers</button>
      </div>
    );
  }

  return (
    <div style={{ color: '#111' }}>
      <h1>Create Developer</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <input placeholder="First Name" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={{ padding: '0.5rem' }} />
        <input placeholder="Last Name" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={{ padding: '0.5rem' }} />
        <input type="email" placeholder="Email (@dev.vlyntech.com)" pattern=".*@dev\.vlyntech\.com$" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ padding: '0.5rem' }} />
        
        {profile?.role === 'MANAGEMENT' && (
          <select required value={form.vendorId} onChange={e => setForm({...form, vendorId: e.target.value})} style={{ padding: '0.5rem' }}>
            <option value="">Select Partner</option>
            {vendors.map((v: any) => (
              <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
            ))}
          </select>
        )}

        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>Create Developer</button>
      </form>
    </div>
  );
}
