import React from 'react';
import { motion } from 'framer-motion';

export function Loader({ text = 'Loading...', fullScreen = false }: { text?: string, fullScreen?: boolean }) {
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: fullScreen ? '100vh' : '200px', gap: '2rem', width: '100%' }}>
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute', inset: 0,
            border: '4px solid transparent',
            borderTopColor: '#f97316',
            borderRightColor: '#f97316',
            borderRadius: '50%',
            opacity: 0.8
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute', inset: '8px',
            border: '4px solid transparent',
            borderBottomColor: '#334155', 
            borderLeftColor: '#334155',
            borderRadius: '50%',
            opacity: 0.8
          }}
        />
        <motion.div
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute', inset: '24px',
            backgroundColor: '#f97316',
            borderRadius: '50%',
            boxShadow: '0 0 16px rgba(249, 115, 22, 0.8)'
          }}
        />
      </div>
      
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ 
          color: '#f97316', 
          fontWeight: 700, 
          fontSize: '0.85rem', 
          letterSpacing: '0.15em', 
          textTransform: 'uppercase',
          textShadow: '0 0 8px rgba(249, 115, 22, 0.2)'
        }}
      >
        {text}
      </motion.div>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999 }}>
        {content}
      </div>
    );
  }

  return content;
}
