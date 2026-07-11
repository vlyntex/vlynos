'use client';
import React from 'react';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Cognitive Architecture',
    description: 'Neural pathways designed to mimic human reasoning, enabling zero-shot problem solving across infinite domains.',
    icon: '🧠'
  },
  {
    title: 'Quantum Scalability',
    description: 'Deploys across 10,000+ nodes instantly with zero-latency synchronization and self-healing infrastructure.',
    icon: '⚡'
  },
  {
    title: 'Hyper-Secure Enclaves',
    description: 'Military-grade encryption with physical air-gapped simulations. Your proprietary data never leaves the vault.',
    icon: '🛡️'
  }
];

export function Features() {
  return (
    <section style={{ 
      padding: '8rem 2rem', 
      backgroundColor: '#FFFFFF',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '6rem' }}
        >
          <h2 style={{ 
            fontSize: 'clamp(2rem, 5vw, 3.5rem)', 
            fontWeight: 700, 
            color: '#0A0A0A',
            letterSpacing: '-0.02em',
            marginBottom: '1rem'
          }}>
            Engineered for <span style={{ color: '#FF6A00' }}>Tomorrow</span>
          </h2>
          <p style={{
            fontSize: '1.25rem',
            color: '#2A2A2A',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            We stripped away the legacy constraints to build an intelligence platform that scales at the speed of thought.
          </p>
        </motion.div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '3rem' 
        }}>
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10 }}
              style={{
                padding: '3rem 2rem',
                backgroundColor: 'rgba(245, 245, 245, 0.5)',
                borderRadius: '24px',
                border: '1px solid rgba(10, 10, 10, 0.05)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '16px', 
                backgroundColor: '#0A0A0A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 10px 20px rgba(255, 106, 0, 0.15)'
              }}>
                {feature.icon}
              </div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 700, 
                color: '#0A0A0A',
                marginBottom: '1rem'
              }}>
                {feature.title}
              </h3>
              <p style={{
                color: '#2A2A2A',
                lineHeight: 1.6,
                fontSize: '1.05rem'
              }}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
