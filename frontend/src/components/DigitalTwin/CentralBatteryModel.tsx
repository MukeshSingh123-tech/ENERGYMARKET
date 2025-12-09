import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface CentralBatteryModelProps {
  position: [number, number, number];
  stateOfCharge: number;
  chargingPower: number;
  dischargingPower: number;
}

export const CentralBatteryModel = ({ 
  position, 
  stateOfCharge, 
  chargingPower, 
  dischargingPower 
}: CentralBatteryModelProps) => {
  const glowRef = useRef<THREE.Mesh>(null);
  const energyRef = useRef<THREE.Mesh>(null);

  const isCharging = chargingPower > dischargingPower;
  const netPower = chargingPower - dischargingPower;

  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      glowRef.current.scale.set(pulse, 1, pulse);
    }
    if (energyRef.current && isCharging) {
      energyRef.current.rotation.y += 0.02;
    }
  });

  const getBatteryColor = () => {
    if (stateOfCharge > 70) return "#22c55e";
    if (stateOfCharge > 30) return "#fbbf24";
    return "#ef4444";
  };

  return (
    <group position={position}>
      {/* Base Platform */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3.2, 0.3, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Battery Container */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[2, 2.2, 3.5, 32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.1} transparent opacity={0.9} />
      </mesh>

      {/* Battery Level Indicator */}
      <mesh position={[0, 0.3 + (stateOfCharge / 100) * 1.7, 0]}>
        <cylinderGeometry args={[1.9, 1.9, (stateOfCharge / 100) * 3.4, 32]} />
        <meshStandardMaterial 
          color={getBatteryColor()} 
          emissive={getBatteryColor()} 
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Battery Top Cap */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[1.5, 2, 0.5, 32]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Terminal Positive */}
      <mesh position={[0.5, 4.5, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
        <meshStandardMaterial color="#ef4444" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Terminal Negative */}
      <mesh position={[-0.5, 4.5, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Energy Ring (animated when charging) */}
      <mesh ref={energyRef} position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.1, 8, 32]} />
        <meshStandardMaterial 
          color={isCharging ? "#22c55e" : "#3b82f6"}
          emissive={isCharging ? "#22c55e" : "#3b82f6"}
          emissiveIntensity={isCharging ? 1 : 0.3}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Glow Effect */}
      <mesh ref={glowRef} position={[0, 2, 0]}>
        <sphereGeometry args={[2.8, 16, 16]} />
        <meshStandardMaterial 
          color={getBatteryColor()}
          emissive={getBatteryColor()}
          emissiveIntensity={0.3}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Point Light */}
      <pointLight
        position={[0, 3, 0]}
        color={getBatteryColor()}
        intensity={3}
        distance={10}
      />

      {/* Labels */}
      <Text
        position={[0, 6, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        CENTRAL BATTERY
      </Text>

      <Text
        position={[0, 5.5, 0]}
        fontSize={0.4}
        color={getBatteryColor()}
        anchorX="center"
        anchorY="middle"
      >
        {stateOfCharge.toFixed(0)}% SoC
      </Text>

      <Text
        position={[0, 5, 0]}
        fontSize={0.3}
        color={isCharging ? "#22c55e" : "#3b82f6"}
        anchorX="center"
        anchorY="middle"
      >
        {isCharging ? `+${netPower.toFixed(1)} kW` : `${netPower.toFixed(1)} kW`}
      </Text>
    </group>
  );
};
