import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface EVChargingStationProps {
  position: [number, number, number];
  chargingPower: number;
  isActive: boolean;
}

export const EVChargingStation = ({ position, chargingPower, isActive }: EVChargingStationProps) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const carRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (lightRef.current && isActive) {
      lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 4) * 1;
    }
    if (carRef.current) {
      carRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group position={position}>
      {/* Ground Pad */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[5, 0.1, 4]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Parking Lines */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[3.5, 0.02, 0.1]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>

      {/* Charging Station Post */}
      <mesh position={[-1.8, 1.2, 0]}>
        <boxGeometry args={[0.6, 2.4, 0.4]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Charging Station Screen */}
      <mesh position={[-1.5, 1.5, 0]}>
        <boxGeometry args={[0.05, 0.8, 0.6]} />
        <meshStandardMaterial 
          color={isActive ? "#22c55e" : "#64748b"}
          emissive={isActive ? "#22c55e" : "#1e293b"}
          emissiveIntensity={isActive ? 0.8 : 0.2}
        />
      </mesh>

      {/* Charging Cable */}
      {isActive && (
        <mesh position={[-0.5, 0.8, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* EV Car Model */}
      <group ref={carRef} position={[0.8, 0.3, 0]}>
        {/* Car Body */}
        <mesh>
          <boxGeometry args={[2.2, 0.5, 1.2]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Car Roof */}
        <mesh position={[0.2, 0.4, 0]}>
          <boxGeometry args={[1.2, 0.4, 1]} />
          <meshStandardMaterial color="#2563eb" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Windows */}
        <mesh position={[0.2, 0.4, 0.51]}>
          <boxGeometry args={[1, 0.3, 0.02]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.3} transparent opacity={0.8} />
        </mesh>

        {/* Wheels */}
        {[[-0.7, -0.25, 0.6], [-0.7, -0.25, -0.6], [0.7, -0.25, 0.6], [0.7, -0.25, -0.6]].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        ))}

        {/* Charging Port Glow */}
        {isActive && (
          <mesh position={[-1.15, 0, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
          </mesh>
        )}
      </group>

      {/* Status Light */}
      {isActive && (
        <pointLight
          ref={lightRef}
          position={[-1.5, 2, 0]}
          color="#22c55e"
          intensity={2}
          distance={5}
        />
      )}

      {/* Global Welfare Label */}
      <Text
        position={[0, 3.5, 0]}
        fontSize={0.4}
        color="#22c55e"
        anchorX="center"
        anchorY="middle"
      >
        EV CHARGING
      </Text>

      <Text
        position={[0, 3, 0]}
        fontSize={0.3}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Global Welfare
      </Text>

      <Text
        position={[0, 2.6, 0]}
        fontSize={0.35}
        color={isActive ? "#22c55e" : "#64748b"}
        anchorX="center"
        anchorY="middle"
      >
        {isActive ? `${chargingPower.toFixed(1)} kW` : "Standby"}
      </Text>
    </group>
  );
};
