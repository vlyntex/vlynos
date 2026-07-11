'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = () => api.get('/system/settings').then(setSettings);
  useEffect(() => { load(); }, []);

  const save = async (key: string) => {
    try {
      await api.post('/system/settings', { key, value: editValue });
      setEditingKey(null);
      load();
    } catch (e) {
      alert('Failed to update setting');
    }
  };

  return (
    <div>
      <h3>Dynamic System Configurations</h3>
      <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '1rem' }}>Key</th>
            <th style={{ padding: '1rem' }}>Value</th>
            <th style={{ padding: '1rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {settings.map(s => (
            <tr key={s.key} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '1rem', fontWeight: 'bold', color: '#374151' }}>{s.key}</td>
              <td style={{ padding: '1rem' }}>
                {editingKey === s.key ? (
                  <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ padding: '0.5rem', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
                ) : s.value}
              </td>
              <td style={{ padding: '1rem' }}>
                {editingKey === s.key ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => save(s.key)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingKey(null)} style={{ background: '#9ca3af', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingKey(s.key); setEditValue(s.value); }} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
                )}
              </td>
            </tr>
          ))}
          {settings.length === 0 && <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center' }}>No settings found. Try viewing the dashboard to initialize defaults.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
