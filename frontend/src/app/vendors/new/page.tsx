'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewVendorPage() {
  const [form, setForm] = useState({ name: '', email: '', firstName: '', lastName: '' });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/vendors', form);
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (result) {
    return (
      <div style={{ color: '#111' }}>
        <h1>Partner Created Successfully</h1>
        <p><strong>Code / Partner ID:</strong> {result.vendor.code}</p>
        <p><strong>Temporary Password:</strong> {result.tempPassword}</p>
        <p style={{ color: 'red' }}>Please save these credentials now. They will not be shown again.</p>
        <button onClick={() => router.push('/vendors')} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back to Partners</button>
      </div>
    );
  }

  return (
    <div style={{ color: '#111' }}>
      <h1>Create Partner</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <input placeholder="Partner Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ padding: '0.5rem' }} />
        <input type="email" placeholder="Admin Email (@dev.vlyntech.com)" pattern=".*@dev\.vlyntech\.com$" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ padding: '0.5rem' }} />
        <input placeholder="Admin First Name" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} style={{ padding: '0.5rem' }} />
        <input placeholder="Admin Last Name" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} style={{ padding: '0.5rem' }} />
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>Create Partner</button>
      </form>
    </div>
  );
}
