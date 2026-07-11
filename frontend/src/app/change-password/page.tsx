'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#111' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '400px', background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2>Change Password Required</h2>
        <p style={{ color: '#6b7280' }}>Please update your password to continue.</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <input 
          type="password" 
          placeholder="Current Password" 
          required 
          value={oldPassword} 
          onChange={e => setOldPassword(e.target.value)} 
          style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
        />
        <input 
          type="password" 
          placeholder="New Password (min 8 characters)" 
          required 
          value={newPassword} 
          onChange={e => setNewPassword(e.target.value)} 
          style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px' }} 
        />
        <button type="submit" style={{ padding: '0.75rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Update Password</button>
      </form>
    </div>
  );
}
