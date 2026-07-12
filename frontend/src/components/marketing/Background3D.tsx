'use client';
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Instances, Instance, Environment, Sparkles, Float, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

const SHARD_COUNT = 80;
const OBSIDIAN_COUNT = 60;

function GlacierShards({ dpr }: { dpr: number }) {
  const ref = useRef<THREE.Group>(null);
  
  const data = useMemo(() => 
    new Array(SHARD_COUNT).fill(0).map(() => ({
      position: [
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20 - 5
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ] as [number, number, number],
      scale: 0.5 + Math.random() * 2,
      isFrosted: Math.random() > 0.7,
      isHexagon: Math.random() > 0.5
    }))
  , []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const scrollY = window.scrollY || 0;
    
    if (ref.current) {
      ref.current.rotation.y = time * 0.02 + scrollY * 0.0005;
      ref.current.rotation.x = Math.sin(time * 0.05) * 0.1 + scrollY * 0.0002;
      
      // Floating glass response & magnetic interaction
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, (state.pointer.x * state.viewport.width) / 20, 0.05);
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, (state.pointer.y * state.viewport.height) / 20 + (scrollY * 0.01), 0.05);
    }
  });

  // Scale down complexity if DPR is low
  const materialQuality = dpr > 1 ? 0 : 1; // Used for transmission/roughness tuning if needed

  return (
    <group ref={ref}>
      {/* Clear Glacier Prisms */}
      <Instances limit={SHARD_COUNT} range={SHARD_COUNT}>
        <octahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial 
          color="#ffffff"
          transmission={0.95}
          opacity={1}
          metalness={0.1}
          roughness={0.05}
          ior={1.5}
          thickness={2}
          specularIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
        {data.filter(d => !d.isFrosted && !d.isHexagon).map((props, i) => (
          <Instance key={`clear-${i}`} position={props.position} rotation={props.rotation} scale={props.scale} />
        ))}
      </Instances>

      {/* Hexagon/Cylinder Glass */}
      <Instances limit={SHARD_COUNT} range={SHARD_COUNT}>
        <cylinderGeometry args={[0.5, 0.5, 1.5, 6]} />
        <meshPhysicalMaterial 
          color="#f8f9fa"
          transmission={0.9}
          opacity={1}
          metalness={0.2}
          roughness={0.1}
          ior={1.4}
          thickness={1.5}
          clearcoat={1}
        />
        {data.filter(d => d.isHexagon).map((props, i) => (
          <Instance key={`hex-${i}`} position={props.position} rotation={props.rotation} scale={props.scale} />
        ))}
      </Instances>

      {/* Frosted Glacier Layers */}
      <Instances limit={SHARD_COUNT} range={SHARD_COUNT}>
        <boxGeometry args={[2, 2, 0.2]} />
        <meshPhysicalMaterial 
          color="#ffffff"
          transmission={0.8}
          opacity={1}
          metalness={0.1}
          roughness={0.6}
          ior={1.2}
          thickness={0.5}
        />
        {data.filter(d => d.isFrosted).map((props, i) => (
          <Instance key={`frost-${i}`} position={props.position} rotation={props.rotation} scale={props.scale} />
        ))}
      </Instances>
    </group>
  );
}

function ObsidianGeometry() {
  const ref = useRef<THREE.Group>(null);
  
  const data = useMemo(() => 
    new Array(OBSIDIAN_COUNT).fill(0).map(() => ({
      position: [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 15 - 5
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0
      ] as [number, number, number],
      scale: 0.3 + Math.random() * 1.5,
      isWireframe: Math.random() > 0.85
    }))
  , []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = -time * 0.015;
      ref.current.rotation.x = -Math.sin(time * 0.02) * 0.1;
      
      const scrollY = window.scrollY || 0;
      ref.current.position.y = (scrollY * 0.005);
    }
  });

  return (
    <group ref={ref}>
      {/* Polished Obsidian Cubes */}
      <Instances limit={OBSIDIAN_COUNT} range={OBSIDIAN_COUNT}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial 
          color="#020202"
          metalness={0.9}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={2}
        />
        {data.filter(d => !d.isWireframe).map((props, i) => (
          <Instance key={`obsidian-${i}`} position={props.position} rotation={props.rotation} scale={props.scale} />
        ))}
      </Instances>

      {/* Crystal Wireframes with Orange Glow Edge */}
      <Instances limit={OBSIDIAN_COUNT} range={OBSIDIAN_COUNT}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial 
          color="#FF6A00" 
          wireframe 
          transparent
          opacity={0.6}
        />
        {data.filter(d => d.isWireframe).map((props, i) => (
          <Instance key={`wire-${i}`} position={props.position} rotation={props.rotation} scale={props.scale * 1.1} />
        ))}
      </Instances>
    </group>
  );
}

function CinematicEffects({ dpr }: { dpr: number }) {
  // Only render expensive DOF on high-end devices (DPR > 1)
  return (
    <EffectComposer multisampling={dpr > 1 ? 2 : 0} disableNormalPass>
      <Bloom 
        luminanceThreshold={0.5} 
        luminanceSmoothing={0.9} 
        intensity={1.5} 
        mipmapBlur 
      />
       {dpr > 1 ? (
        <DepthOfField 
          focusDistance={0.0} 
          focalLength={0.02} 
          bokehScale={2} 
          height={480} 
        />
      ) : (
        <></>
      )}
      <Noise opacity={0.02} />
    </EffectComposer>
  );
}

export function Background3D() {
  const [dpr, setDpr] = useState(1.5);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -10, backgroundColor: '#FFFFFF', pointerEvents: 'none' }}>
      <Canvas 
        camera={{ position: [0, 0, 15], fov: 45 }}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(2)} />
        
        {/* Cinematic Studio Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={3} color="#FFFFFF" castShadow />
        
        {/* Orange Rim Light */}
        <spotLight 
          position={[-15, -10, -15]} 
          intensity={8} 
          color="#FF6A00" 
          angle={0.5}
          penumbra={1} 
          distance={50}
        />
        
        <GlacierShards dpr={dpr} />
        <ObsidianGeometry />
        
        {/* Volumetric ambient particles */}
        <Sparkles count={200} scale={30} size={1} speed={0.1} opacity={0.3} color="#0A0A0A" />
        <Sparkles count={100} scale={20} size={3} speed={0.3} opacity={0.6} color="#FF6A00" />
        
        {/* Global Illumination / Reflections */}
        <Environment preset="studio" />
        
        <CinematicEffects dpr={dpr} />
      </Canvas>
    </div>
  );
}
