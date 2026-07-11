'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ErrorsPage() {
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    api.get('/system/errors').then(setErrors);
  }, []);

  return (
    <div>
      <h3>Error Registry</h3>
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {errors.map(err => (
          <div key={err.id} style={{ background: 'white', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <span>User: {err.userId || 'Guest'} | Route: {err.route}</span>
              <span>{new Date(err.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ color: '#b91c1c', fontWeight: 'bold', marginBottom: '0.5rem' }}>{err.error}</div>
            <pre style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '4px', fontSize: '0.8rem', overflowX: 'auto', margin: 0 }}>
              {err.stackTrace}
            </pre>
          </div>
        ))}
        {errors.length === 0 && <p>No errors recorded.</p>}
      </div>
    </div>
  );
}
