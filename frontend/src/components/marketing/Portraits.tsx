'use client';
import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const portraits = [
  { src: '/images/portrait_1.png', role: 'Chief Executive Officer', name: 'Dr. Evelyn Hayes' },
  { src: '/images/portrait_2.png', role: 'Chief Technology Officer', name: 'Sarah Chen' },
  { src: '/images/portrait_3.png', role: 'Head of AI Research', name: 'Marcus Sterling' }
];

export function Portraits() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <section style={{ 
      padding: '8rem 2rem', 
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      position: 'relative',
      zIndex: 10,
      overflow: 'hidden'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem', flexWrap: 'wrap', gap: '2rem' }}>
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 style={{ 
              fontSize: 'clamp(2rem, 5vw, 3.5rem)', 
              fontWeight: 700, 
              letterSpacing: '-0.02em',
              marginBottom: '1rem'
            }}>
              The Minds Behind<br />
              <span style={{ color: '#FF6A00' }}>The Machine</span>
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ color: '#E8E8E8', maxWidth: '400px', fontSize: '1.125rem', lineHeight: 1.6 }}
          >
            Our leadership team combines decades of experience in quantum computing, neural architecture, and enterprise scaling.
          </motion.p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          marginTop: '4rem'
        }}>
          {portraits.map((portrait, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              style={{ position: 'relative', group: 'true' }}
            >
              <div style={{ 
                position: 'relative', 
                borderRadius: '16px', 
                overflow: 'hidden',
                aspectRatio: '3/4',
                backgroundColor: '#111'
              }}>
                <motion.img 
                  src={portrait.src} 
                  alt={portrait.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  padding: '2rem 1.5rem',
                  background: 'linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0) 100%)'
                }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>{portrait.name}</h3>
                  <p style={{ color: '#FF6A00', fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {portrait.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
