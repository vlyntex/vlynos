'use client';
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';

// 1. The Sweeping Data Stream Wave
function ParticleWave() {
  const count = 4000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60; // x spread
      pos[i * 3 + 1] = 0; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40; // z spread
    }
    return pos;
  }, [count]);

  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame((state) => {
    if (!geometryRef.current) return;
    const time = state.clock.getElapsedTime();
    const pos = geometryRef.current.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const x = pos[i * 3];
      const z = pos[i * 3 + 2];
      
      // Complex sweeping wave math combining sine/cosine
      pos[i * 3 + 1] = 
        Math.sin(x * 0.15 + time * 0.5) * 2 + 
        Math.cos(z * 0.15 + time * 0.4) * 2 +
        Math.sin((x + z) * 0.05 - time) * 1.5;
    }
    geometryRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points position={[0, -2, -10]} rotation={[0.2, 0, 0]}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} args={[positions, 3]} />
      </bufferGeometry>
      {/* Dark charcoal color for the data stream */}
      <pointsMaterial size={0.06} color="#334155" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// 2. The Neural Network Nodes
function NeuralNetwork() {
  const nodeCount = 120;
  const maxDistance = 4.5;
  
  const nodes = useMemo(() => {
    return new Array(nodeCount).fill(0).map(() => ({
      position: new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 15 - 5),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03)
    }));
  }, [nodeCount]);

  const pointsRef = useRef<THREE.Points>(null);
  const linesGeometryRef = useRef<THREE.BufferGeometry>(null);
  const positionsArray = useMemo(() => new Float32Array(nodeCount * 3), [nodeCount]);

  useFrame(() => {
    if (!pointsRef.current || !linesGeometryRef.current) return;
    
    // Update node positions
    nodes.forEach((node, i) => {
      node.position.add(node.velocity);
      
      // Bounce off invisible boundaries to keep them on screen
      if (node.position.x > 20 || node.position.x < -20) node.velocity.x *= -1;
      if (node.position.y > 12 || node.position.y < -12) node.velocity.y *= -1;
      if (node.position.z > 5 || node.position.z < -20) node.velocity.z *= -1;

      positionsArray[i * 3] = node.position.x;
      positionsArray[i * 3 + 1] = node.position.y;
      positionsArray[i * 3 + 2] = node.position.z;
    });

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Connect close nodes with lines
    const linePositions = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < maxDistance) {
          linePositions.push(
            nodes[i].position.x, nodes[i].position.y, nodes[i].position.z,
            nodes[j].position.x, nodes[j].position.y, nodes[j].position.z
          );
        }
      }
    }
    
    // Update line geometry
    linesGeometryRef.current.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nodeCount} array={positionsArray} itemSize={3} />
        </bufferGeometry>
        {/* Dark charcoal color for nodes */}
        <pointsMaterial size={0.15} color="#1e293b" transparent opacity={0.8} sizeAttenuation />
      </points>
      <lineSegments>
        <bufferGeometry ref={linesGeometryRef} />
        {/* Lighter grey lines with low opacity */}
        <lineBasicMaterial color="#475569" transparent opacity={0.15} linewidth={1} />
      </lineSegments>
    </group>
  );
}

// -- Main Scene --
export function LoginBackground3D() {
  const [dpr, setDpr] = useState(1.5);

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, 
        // Beautiful soft pastel gradient exactly mimicking the reference image
        background: 'linear-gradient(135deg, #d1fae5 0%, #fbcfe8 50%, #bae6fd 100%)',
        pointerEvents: 'none' 
      }}>
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(2)} />
        
        <ParticleWave />
        <NeuralNetwork />
        
      </Canvas>
    </div>
  );
}
