import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface StateGridModelProps {
  position: [number, number, number];
  importPower: number;
  exportPower: number;
}

export const StateGridModel = ({ position, importPower, exportPower }: StateGridModelProps) => {
  const pylonRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const netFlow = exportPower - importPower;
  const isExporting = netFlow > 0;

  useFrame((state) => {
    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position} ref={pylonRef}>
      {/* Base Platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[4, 0.2, 4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main Tower */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 6, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Cross Arms */}
      <mesh position={[0, 5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 3, 6]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Insulators */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 5.3, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 0.5, 8]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Power Lines (to indicate grid connection) */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={`wire-${i}`} position={[x, 5.5, -3]}>
          <cylinderGeometry args={[0.02, 0.02, 6, 4]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* State Grid Building */}
      <mesh position={[0, 1.2, 2]}>
        <boxGeometry args={[2, 2.4, 1.5]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Building Windows */}
      <mesh position={[0, 1.5, 2.76]}>
        <boxGeometry args={[1.2, 1, 0.05]} />
        <meshStandardMaterial 
          color={isExporting ? "#22c55e" : "#ef4444"} 
          emissive={isExporting ? "#22c55e" : "#ef4444"} 
          emissiveIntensity={0.8} 
        />
      </mesh>

      {/* Status Indicator Pulse */}
      <mesh ref={pulseRef} position={[0, 6.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color={isExporting ? "#22c55e" : importPower > 0 ? "#ef4444" : "#3b82f6"}
          emissive={isExporting ? "#22c55e" : importPower > 0 ? "#ef4444" : "#3b82f6"}
          emissiveIntensity={1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Point Light */}
      <pointLight
        position={[0, 6.5, 0]}
        color={isExporting ? "#22c55e" : "#ef4444"}
        intensity={2}
        distance={8}
      />

      {/* Labels */}
      <Text
        position={[0, 7.5, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        STATE GRID
      </Text>

      <Text
        position={[0, 7, 0]}
        fontSize={0.35}
        color={isExporting ? "#22c55e" : "#ef4444"}
        anchorX="center"
        anchorY="middle"
      >
        {isExporting ? `Export: ${netFlow.toFixed(1)} kW` : `Import: ${Math.abs(netFlow).toFixed(1)} kW`}
      </Text>
    </group>
  );
};
