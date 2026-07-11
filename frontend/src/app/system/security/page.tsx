'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SecurityPage() {
  const [data, setData] = useState<{failedLogins: any[], activeSessions: any[]}>({ failedLogins: [], activeSessions: [] });

  const load = () => api.get('/system/security').then(setData);
  useEffect(() => { load(); }, []);

  const forceLogout = async (sessionId: string) => {
    try {
      await api.post('/system/security/logout', { sessionId });
      load();
    } catch (e) {
      alert('Failed to revoke session');
    }
  };

  const revokeAll = async (userId: string) => {
    try {
      await api.post('/system/security/revoke-all', { userId });
      load();
    } catch (e) {
      alert('Failed to revoke all sessions');
    }
  };

  return (
    <div>
      <h3>Security & Session Management</h3>
      
      <div style={{ marginTop: '2rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Active Sessions</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>User</th>
              <th style={{ padding: '1rem' }}>IP</th>
              <th style={{ padding: '1rem' }}>Device / Browser</th>
              <th style={{ padding: '1rem' }}>Last Activity</th>
              <th style={{ padding: '1rem' }}>Expires At</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.activeSessions.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem' }}>{s.user.firstName} {s.user.lastName} ({s.user.email})</td>
                <td style={{ padding: '1rem' }}>{s.ip}</td>
                <td style={{ padding: '1rem' }}>{s.os} <br/><small style={{color:'#6b7280'}}>{s.browser}</small></td>
                <td style={{ padding: '1rem' }}>{new Date(s.lastActivityAt).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>{new Date(s.expiresAt).toLocaleString()}</td>
                <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <button onClick={() => forceLogout(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>Revoke Session</button>
                  <button onClick={() => revokeAll(s.userId)} style={{ color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>Revoke All for User</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Recent Failed Logins</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '1rem' }}>Email Attempted</th>
              <th style={{ padding: '1rem' }}>IP Address</th>
              <th style={{ padding: '1rem' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.failedLogins.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem' }}>{f.email}</td>
                <td style={{ padding: '1rem' }}>{f.ip}</td>
                <td style={{ padding: '1rem' }}>{new Date(f.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
