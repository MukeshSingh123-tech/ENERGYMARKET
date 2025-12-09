import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface PowerLineProps {
  from: [number, number, number];
  to: [number, number, number];
  power: number;
  active?: boolean;
}

export const PowerLine = ({ from, to, power, active = true }: PowerLineProps) => {
  const particlesRef = useRef<THREE.Points>(null);

  const direction = power >= 0 ? 1 : -1;
  const powerMagnitude = Math.abs(power);
  const normalized = Math.min(powerMagnitude / 100, 1);

  const linePoints = useMemo(() => [from, to], [from, to]);

  const particlePositions = useMemo(() => {
    const particleCount = 15;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      positions[i * 3] = from[0] + (to[0] - from[0]) * t;
      positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * t;
      positions[i * 3 + 2] = from[2] + (to[2] - from[2]) * t;
    }
    return positions;
  }, [from, to]);

  useFrame((state) => {
    if (particlesRef.current && active) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const particleCount = positions.length / 3;
      
      for (let i = 0; i < particleCount; i++) {
        let t = (i / particleCount + state.clock.elapsedTime * 0.2 * direction) % 1;
        if (t < 0) t += 1;
        
        positions[i * 3] = from[0] + (to[0] - from[0]) * t;
        positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * t;
        positions[i * 3 + 2] = from[2] + (to[2] - from[2]) * t;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const lineColor = power >= 0 ? '#10b981' : '#3b82f6';

  return (
    <group>
      {/* Main Power Line */}
      <Line
        points={linePoints}
        color={lineColor}
        lineWidth={2}
        transparent
        opacity={0.8}
      />

      {/* Glow Line */}
      <Line
        points={linePoints}
        color={lineColor}
        lineWidth={4}
        transparent
        opacity={normalized * 0.3}
      />

      {/* Animated particles */}
      {active && powerMagnitude > 0.1 && (
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
            color={lineColor}
            size={0.15}
            sizeAttenuation
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
};
