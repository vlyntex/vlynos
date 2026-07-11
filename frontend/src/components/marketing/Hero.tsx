'use client';
import React from 'react';
import { motion } from 'framer-motion';

export function Hero() {
  return (
    <section style={{ 
      position: 'relative', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '2rem',
      textAlign: 'center',
      zIndex: 10
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ maxWidth: '800px', width: '100%' }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(10, 10, 10, 0.05)',
            borderRadius: '100px',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: '#0A0A0A',
            marginBottom: '2rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(10, 10, 10, 0.1)'
          }}
        >
          INTRODUCING VLYNTECH AI
        </motion.div>

        <h1 style={{ 
          fontSize: 'clamp(3rem, 8vw, 6rem)', 
          fontWeight: 800, 
          lineHeight: 1.1, 
          color: '#0A0A0A',
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em'
        }}>
          Intelligence that<br />
          <span style={{ 
            color: '#FF6A00',
            backgroundImage: 'linear-gradient(135deg, #FF6A00 0%, #FFA040 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            adapts
          </span> to you.
        </h1>

        <p style={{
          fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
          color: '#2A2A2A',
          lineHeight: 1.6,
          marginBottom: '3rem',
          fontWeight: 400,
          maxWidth: '600px',
          margin: '0 auto 3rem'
        }}>
          Experience the next generation of autonomous enterprise AI. Built for speed, precision, and unparalleled scale.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
              borderRadius: '100px',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(10, 10, 10, 0.2)',
              transition: 'box-shadow 0.3s ease'
            }}
          >
            Get Early Access
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(10, 10, 10, 0.05)' }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: 'transparent',
              color: '#0A0A0A',
              borderRadius: '100px',
              fontSize: '1rem',
              fontWeight: 600,
              border: '1px solid rgba(10, 10, 10, 0.2)',
              cursor: 'pointer'
            }}
          >
            View Documentation
          </motion.button>
        </div>
      </motion.div>
      
      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '30px',
          height: '50px',
          borderRadius: '15px',
          border: '2px solid rgba(10, 10, 10, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '8px'
        }}
      >
        <div style={{
          width: '6px',
          height: '6px',
          backgroundColor: '#0A0A0A',
          borderRadius: '50%'
        }} />
      </motion.div>
    </section>
  );
}
