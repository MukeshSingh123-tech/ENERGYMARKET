import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface PowerFlowLineProps {
  from: [number, number, number];
  to: [number, number, number];
  power: number;
  color?: string;
}

export const PowerFlowLine = ({ from, to, power, color = "#22c55e" }: PowerFlowLineProps) => {
  const particlesRef = useRef<THREE.Points>(null);
  
  const isActive = Math.abs(power) > 0.1;
  const flowDirection = power >= 0 ? 1 : -1;

  const linePoints = useMemo(() => [from, to], [from, to]);

  const particlePositions = useMemo(() => {
    const particleCount = 12;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      positions[i * 3] = from[0] + (to[0] - from[0]) * t;
      positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * t + 0.3;
      positions[i * 3 + 2] = from[2] + (to[2] - from[2]) * t;
    }
    return positions;
  }, [from, to]);

  useFrame((state) => {
    if (particlesRef.current && isActive) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      const speed = 0.4 * flowDirection;
      const particleCount = positions.length / 3;
      
      for (let i = 0; i < particleCount; i++) {
        let t = ((i / particleCount) + time * speed) % 1;
        if (t < 0) t += 1;
        
        positions[i * 3] = from[0] + (to[0] - from[0]) * t;
        positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * t + 0.3 + Math.sin(time * 3 + i) * 0.08;
        positions[i * 3 + 2] = from[2] + (to[2] - from[2]) * t;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!isActive) return null;

  return (
    <group>
      {/* Main Line */}
      <Line
        points={linePoints}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.5}
      />

      {/* Animated Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial 
          color={color} 
          size={0.2} 
          transparent 
          opacity={0.9}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
