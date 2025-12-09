import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { Scene } from '@/components/DigitalTwin/Scene';
import { ComponentDetailsPanel } from '@/components/DigitalTwin/ComponentDetailsPanel';
import { useSmartGridData } from '@/hooks/useSmartGridData';
import { useBlockchainData } from '@/hooks/useBlockchainData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Battery, Activity, TrendingUp, Car, Building2, ArrowUpDown, Download, FileSpreadsheet } from 'lucide-react';
import { exportEnergyFlowToCSV, exportDetailedEnergyReport, createEnergyFlowSnapshot } from '@/utils/exportEnergyData';
import { toast } from 'sonner';
import { NANOGRID_ADDRESSES } from '@/blockchain/config';

interface NanogridData {
  nanogrid_id: number;
  address: string;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
}

const DigitalTwin = () => {
  const gridData = useSmartGridData();
  const { transactions } = useBlockchainData();
  const [selectedNanogrid, setSelectedNanogrid] = useState<NanogridData | null>(null);
  const [energyHistory, setEnergyHistory] = useState<ReturnType<typeof createEnergyFlowSnapshot>[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  // Map nanogrids to their configured addresses
  const nanogridsWithAddresses = (gridData.nanogrids || []).map((ng, idx) => ({
    ...ng,
    address: Object.values(NANOGRID_ADDRESSES).slice(2)[idx] || ng.address
  }));

  const nanogrids = nanogridsWithAddresses;

  const totalGeneration = nanogrids.reduce((sum, ng) => sum + ng.solar_output, 0);
  const totalLoad = nanogrids.reduce((sum, ng) => sum + ng.load_demand, 0);
  const avgBattery = nanogrids.reduce((sum, ng) => sum + ng.battery_soc, 0) / (nanogrids.length || 1);
  
  // Power allocation calculation
  const netPower = totalGeneration - totalLoad;
  const batteryCapacity = 50;
  const batteryCanAccept = Math.max(0, (100 - avgBattery) / 100 * batteryCapacity * 0.5);
  const evMaxPower = 15;
  
  let batteryCharge = 0;
  let evCharge = 0;
  let gridExport = 0;
  let gridImport = 0;
  
  if (netPower > 0) {
    batteryCharge = Math.min(netPower, batteryCanAccept);
    const afterBattery = netPower - batteryCharge;
    evCharge = Math.min(afterBattery, evMaxPower);
    gridExport = afterBattery - evCharge;
  } else {
    gridImport = Math.abs(netPower);
  }

  const stats = {
    totalSolar: totalGeneration,
    totalLoad: totalLoad,
    avgBattery: avgBattery,
    activeNanogrids: nanogrids.length,
    batteryCharge,
    evCharge,
    gridExport,
    gridImport,
    netPower
  };

  // Start/Stop recording energy data
  const toggleRecording = () => {
    if (isRecording) {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      setIsRecording(false);
      toast.success(`Recording stopped. ${energyHistory.length} snapshots captured.`);
    } else {
      setEnergyHistory([]);
      setIsRecording(true);
      toast.info('Recording started. Data will be captured every 5 seconds.');
      
      // Capture immediately
      const snapshot = createEnergyFlowSnapshot(
        totalGeneration, totalLoad, avgBattery, batteryCharge, evCharge, gridExport, gridImport, nanogrids
      );
      setEnergyHistory([snapshot]);
      
      // Then capture every 5 seconds
      recordingInterval.current = setInterval(() => {
        const newSnapshot = createEnergyFlowSnapshot(
          totalGeneration, totalLoad, avgBattery, batteryCharge, evCharge, gridExport, gridImport, nanogrids
        );
        setEnergyHistory(prev => [...prev, newSnapshot]);
      }, 5000);
    }
  };

  // Export current snapshot
  const handleExportSnapshot = () => {
    const snapshot = createEnergyFlowSnapshot(
      totalGeneration, totalLoad, avgBattery, batteryCharge, evCharge, gridExport, gridImport, nanogrids
    );
    exportDetailedEnergyReport(snapshot, snapshot.nanogrids);
    toast.success('Energy flow report exported to CSV!');
  };

  // Export recorded history
  const handleExportHistory = () => {
    if (energyHistory.length === 0) {
      toast.error('No recorded data to export. Start recording first.');
      return;
    }
    exportEnergyFlowToCSV(energyHistory, 'energy_flow_history');
    toast.success(`Exported ${energyHistory.length} snapshots to CSV!`);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        activeTab="digital-twin" 
        onTabChange={() => {}} 
        systemMode={gridData.systemStatus.mode}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Smart Grid Digital Twin
            </h1>
            <p className="text-muted-foreground">
              Real-time 3D visualization of your energy trading network
            </p>
          </div>
          
          {/* Export Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={toggleRecording}
              className="gap-2"
            >
              <Activity className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? `Recording (${energyHistory.length})` : 'Start Recording'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSnapshot}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Snapshot
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleExportHistory}
              disabled={energyHistory.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export History ({energyHistory.length})
            </Button>
          </div>
        </div>

        {/* Stats Grid - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Generation</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSolar.toFixed(1)} kW</div>
              <p className="text-xs text-muted-foreground">All nanogrids combined</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Load</CardTitle>
              <Activity className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLoad.toFixed(1)} kW</div>
              <p className="text-xs text-muted-foreground">Current demand</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <ArrowUpDown className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.netPower >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.netPower >= 0 ? '+' : ''}{stats.netPower.toFixed(1)} kW
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.netPower >= 0 ? 'Surplus power' : 'Deficit'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Nanogrids</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeNanogrids}</div>
              <p className="text-xs text-muted-foreground">Connected to Bus 1</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid - Row 2: Power Allocation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Battery Storage</CardTitle>
              <Battery className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">+{stats.batteryCharge.toFixed(1)} kW</div>
              <p className="text-xs text-muted-foreground">Charging @ {stats.avgBattery.toFixed(0)}% SoC</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">EV Charging</CardTitle>
              <Car className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.evCharge.toFixed(1)} kW</div>
              <p className="text-xs text-muted-foreground">Global welfare</p>
            </CardContent>
          </Card>

          <Card className={`${stats.gridExport > 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">State Grid</CardTitle>
              <Building2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.gridExport > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stats.gridExport > 0 ? `↑ ${stats.gridExport.toFixed(1)}` : `↓ ${stats.gridImport.toFixed(1)}`} kW
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.gridExport > 0 ? 'Exporting to grid' : 'Importing from grid'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Power Balance</CardTitle>
              <Zap className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-purple-500">Gen = Load</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSolar.toFixed(1)} = {stats.totalLoad.toFixed(1)} + Storage
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 3D Visualization */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>3D Grid Visualization</CardTitle>
              <CardDescription>
                Interactive view of all nanogrids and energy flows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] rounded-lg overflow-hidden bg-black/20">
                <Scene
                  nanogrids={nanogrids}
                  transactions={transactions}
                  onNanogridClick={setSelectedNanogrid}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Nanogrid → Bus Flow
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Battery Charging
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  EV Charging
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Grid Export
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Grid Import
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  Bus 1 (Main)
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Component Details Panel */}
          <ComponentDetailsPanel
            nanogrids={nanogrids}
            stats={stats}
            selectedNanogrid={selectedNanogrid}
            onSelectNanogrid={setSelectedNanogrid}
          />

        </div>

        {/* Recent Transactions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Energy Trades</CardTitle>
            <CardDescription>Live transaction feed from the blockchain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <div>
                      <div className="text-sm font-medium">
                        {tx.amount_kwh.toFixed(2)} kWh
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx.sender_address.slice(0, 6)}...{tx.sender_address.slice(-4)} → {tx.receiver_address.slice(0, 6)}...{tx.receiver_address.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DigitalTwin;
