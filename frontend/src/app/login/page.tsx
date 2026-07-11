'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LoginBackground3D } from '@/components/auth/LoginBackground3D';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.user.mustChangePassword) {
        router.push('/change-password');
      } else {
        if (res.user.role === 'VENDOR') {
          window.location.href = '/workers';
        } else if (res.user.role === 'MANAGEMENT') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const accent = '#f97316'; // Orange accent for VLYN and Button

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <LoginBackground3D />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ 
          padding: '3.5rem 3rem', 
          width: '100%', 
          maxWidth: '420px',
          borderRadius: '24px',
          // Opaque, pinkish frosted glass matching reference image
          background: 'rgba(252, 231, 243, 0.65)', 
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          zIndex: 10
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {/* VLYN in orange, TECH in dark slate, NO DOT */}
            <span style={{ color: accent }}>VLYN</span><span style={{ color: '#1e293b' }}>TECH</span>
          </h1>
          <p style={{ color: '#475569', fontSize: '0.95rem', marginTop: '0.5rem', fontWeight: 500 }}>Secure Intelligence Access</p>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ backgroundColor: 'rgba(254, 226, 226, 0.7)', color: '#b91c1c', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(10px)' }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Company Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.875rem 1rem', 
                border: '1px solid rgba(255, 255, 255, 0.6)', 
                borderRadius: '12px', 
                // Light pinkish/white frosted inputs
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                color: '#0f172a',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                e.target.style.border = `1px solid ${accent}`;
                e.target.style.boxShadow = `0 0 0 4px ${accent}25`;
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="jane@vlyntech.com"
              required 
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Password</label>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.875rem 1rem', 
                border: '1px solid rgba(255, 255, 255, 0.6)', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                color: '#0f172a',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                e.target.style.border = `1px solid ${accent}`;
                e.target.style.boxShadow = `0 0 0 4px ${accent}25`;
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                e.target.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="••••••••"
              required 
            />
          </div>
          
          <motion.button 
            type="submit"
            disabled={isLoading}
            whileHover={{ 
              scale: 1.02, 
              backgroundColor: '#000000',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3 }}
            style={{ 
              width: '100%', 
              padding: '0.875rem', 
              marginTop: '0.5rem',
              backgroundColor: accent, // Default Orange Button
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 600, 
              fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: `0 4px 12px ${accent}40`
            }}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
