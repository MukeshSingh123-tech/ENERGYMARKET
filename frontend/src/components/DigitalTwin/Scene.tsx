import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Stars } from '@react-three/drei';
import { NanogridModel } from './NanogridModel';
import { EnergyFlow } from './EnergyFlow';
import { BusModel } from './BusModel';
import { PowerLine } from './PowerLine';
import { StateGridModel } from './StateGridModel';
import { EVChargingStation } from './EVChargingStation';
import { CentralBatteryModel } from './CentralBatteryModel';
import { PowerFlowLine } from './PowerFlowLine';

interface Transaction {
  id: string;
  transaction_hash: string;
  sender_address: string;
  receiver_address: string;
  amount_kwh: number;
  created_at: string;
}

interface NanogridData {
  nanogrid_id: number;
  address: string;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
}

interface SceneProps {
  nanogrids: NanogridData[];
  transactions: Transaction[];
  onNanogridClick?: (nanogrid: NanogridData) => void;
}

export const Scene = ({ nanogrids, transactions, onNanogridClick }: SceneProps) => {
  // IEEE 5-Bus System Configuration
  const busPositions: { [key: number]: [number, number, number] } = {
    1: [0, 0, -12], // Generation Bus (center back) - Main collection point
    2: [-8, 0, 0],  // Load Bus 1 (left)
    3: [-4, 0, 8],  // Load Bus 2 (front left)
    4: [4, 0, 8],   // Load Bus 3 (front right)
    5: [8, 0, 0],   // Load Bus 4 (right)
  };

  // External infrastructure positions
  const stateGridPosition: [number, number, number] = [0, 0, -22]; // Behind Bus 1
  const centralBatteryPosition: [number, number, number] = [-12, 0, -12]; // Left of Bus 1
  const evChargingPosition: [number, number, number] = [12, 0, -12]; // Right of Bus 1

  // Bus connections (transmission lines)
  const busConnections = [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 5 },
  ];

  // Calculate total generation and load
  const totalGeneration = nanogrids.reduce((sum, ng) => sum + ng.solar_output, 0);
  const totalLoad = nanogrids.reduce((sum, ng) => sum + ng.load_demand, 0);
  const avgBatterySoC = nanogrids.reduce((sum, ng) => sum + ng.battery_soc, 0) / (nanogrids.length || 1);
  
  // Power balance: Generation = Load + Battery + EV + Grid Export/Import
  const netPower = totalGeneration - totalLoad;
  
  // Allocation logic:
  // 1. First satisfy load demand
  // 2. Excess goes to battery (if not full)
  // 3. More excess goes to EV charging (global welfare)
  // 4. Remaining exports to state grid OR imports if deficit
  
  const batteryCapacity = 50; // kWh total capacity
  const batteryCanAccept = Math.max(0, (100 - avgBatterySoC) / 100 * batteryCapacity * 0.5);
  const evMaxPower = 15; // kW max EV charging
  
  let batteryChargePower = 0;
  let evChargePower = 0;
  let gridExport = 0;
  let gridImport = 0;
  
  if (netPower > 0) {
    // Surplus power
    batteryChargePower = Math.min(netPower, batteryCanAccept);
    const afterBattery = netPower - batteryChargePower;
    
    evChargePower = Math.min(afterBattery, evMaxPower);
    const afterEV = afterBattery - evChargePower;
    
    gridExport = afterEV;
  } else {
    // Deficit - need to import
    gridImport = Math.abs(netPower);
  }

  // Get nanogrids assigned to each bus (distribute evenly across 4 load buses)
  const getBusNanogrids = (busNumber: number): NanogridData[] => {
    if (busNumber === 1) return [];
    const busIndex = busNumber - 2; // 0, 1, 2, 3 for buses 2-5
    return nanogrids.filter((_, idx) => idx % 4 === busIndex);
  };

  // Calculate bus power levels (power flowing TO Bus 1)
  const calculateBusPower = (busNumber: number) => {
    if (busNumber === 1) {
      return totalGeneration;
    }
    const busNanogrids = getBusNanogrids(busNumber);
    return busNanogrids.reduce((sum, ng) => sum + ng.solar_output, 0);
  };

  // Get bus that a nanogrid belongs to (round-robin distribution)
  const getNanogridBus = (index: number): number => {
    return (index % 4) + 2; // Results in 2, 3, 4, 5, 2, 3, 4, 5...
  };

  // Arrange nanogrids around their respective load buses
  const getNanogridPosition = (index: number): [number, number, number] => {
    const busNumber = getNanogridBus(index);
    const busPos = busPositions[busNumber];
    const busNanogrids = getBusNanogrids(busNumber);
    const localIndex = busNanogrids.findIndex(ng => ng === nanogrids[index]);
    const count = Math.max(1, busNanogrids.length);
    const angle = (localIndex / count) * Math.PI * 2 + Math.PI / 4;
    const radius = 3;
    
    return [
      busPos[0] + Math.cos(angle) * radius,
      busPos[1],
      busPos[2] + Math.sin(angle) * radius
    ];
  };

  // Find active energy flows from recent transactions
  const getActiveFlows = () => {
    const now = Date.now();
    const recentTransactions = transactions.filter(tx => {
      const txTime = new Date(tx.created_at).getTime();
      return now - txTime < 10000;
    });

    return recentTransactions.map(tx => {
      const senderIndex = nanogrids.findIndex(n => n.address.toLowerCase() === tx.sender_address.toLowerCase());
      const receiverIndex = nanogrids.findIndex(n => n.address.toLowerCase() === tx.receiver_address.toLowerCase());
      
      if (senderIndex === -1 || receiverIndex === -1) return null;

      return {
        from: getNanogridPosition(senderIndex),
        to: getNanogridPosition(receiverIndex),
        amount: tx.amount_kwh
      };
    }).filter(Boolean);
  };

  const activeFlows = getActiveFlows();

  return (
    <Canvas
      camera={{ position: [0, 25, 35], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <hemisphereLight intensity={0.5} color="#ffffff" groundColor="#444444" />

      {/* Environment */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="night" />
      
      {/* Grid Floor */}
      <Grid
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6366f1"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#8b5cf6"
        fadeDistance={60}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* IEEE 5-Bus System */}
      {/* Bus 1 - Main Generation/Collection Bus */}
      <BusModel
        busNumber={1}
        busType="generation"
        position={busPositions[1]}
        activePower={totalGeneration}
        voltage={1.05}
      />

      {/* Buses 2-5 - Load Buses */}
      {[2, 3, 4, 5].map((busNum) => (
        <BusModel
          key={busNum}
          busNumber={busNum}
          busType="load"
          position={busPositions[busNum]}
          activePower={calculateBusPower(busNum)}
          voltage={1.0}
        />
      ))}

      {/* State Grid - Import/Export */}
      <StateGridModel
        position={stateGridPosition}
        importPower={gridImport}
        exportPower={gridExport}
      />

      {/* Central Battery Storage */}
      <CentralBatteryModel
        position={centralBatteryPosition}
        stateOfCharge={avgBatterySoC}
        chargingPower={batteryChargePower}
        dischargingPower={netPower < 0 ? Math.min(Math.abs(netPower), avgBatterySoC / 100 * 20) : 0}
      />

      {/* EV Charging Station - Global Welfare */}
      <EVChargingStation
        position={evChargingPosition}
        chargingPower={evChargePower}
        isActive={evChargePower > 0.5}
      />

      {/* Transmission Lines between Buses */}
      {busConnections.map((conn, index) => {
        const powerFlow = calculateBusPower(conn.from) * 0.2;
        return (
          <PowerLine
            key={`line-${index}`}
            from={busPositions[conn.from]}
            to={busPositions[conn.to]}
            power={powerFlow}
            active={true}
          />
        );
      })}

      {/* Power Flow: Nanogrids → Load Buses → Bus 1 */}
      {nanogrids.map((nanogrid, index) => {
        const busNum = getNanogridBus(index);
        const ngPos = getNanogridPosition(index);
        const busPos = busPositions[busNum];
        
        return (
          <PowerFlowLine
            key={`ng-to-bus-${index}`}
            from={ngPos}
            to={busPos}
            power={nanogrid.solar_output}
            color="#fbbf24"
          />
        );
      })}

      {/* Power Flow: Bus 1 → Central Battery */}
      <PowerFlowLine
        from={busPositions[1]}
        to={centralBatteryPosition}
        power={batteryChargePower}
        color="#22c55e"
      />

      {/* Power Flow: Bus 1 → EV Charging */}
      <PowerFlowLine
        from={busPositions[1]}
        to={evChargingPosition}
        power={evChargePower}
        color="#3b82f6"
      />

      {/* Power Flow: Bus 1 ↔ State Grid */}
      <PowerFlowLine
        from={busPositions[1]}
        to={stateGridPosition}
        power={gridExport - gridImport}
        color={gridExport > gridImport ? "#22c55e" : "#ef4444"}
      />

      {/* Nanogrids distributed across load buses */}
      {nanogrids.map((nanogrid, index) => (
        <NanogridModel
          key={nanogrid.nanogrid_id}
          nanogrid={nanogrid}
          position={getNanogridPosition(index)}
          onClick={() => onNanogridClick?.(nanogrid)}
        />
      ))}

      {/* Energy Flows between Nanogrids (P2P trades) */}
      {activeFlows.map((flow, index) => (
        flow && (
          <EnergyFlow
            key={`flow-${index}`}
            from={flow.from}
            to={flow.to}
            active={true}
            amount={flow.amount}
          />
        )
      ))}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={15}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
};
