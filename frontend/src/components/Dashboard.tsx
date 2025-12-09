import { EnergyCard } from "./EnergyCard";
import { NanogridCard } from "./NanogridCard";
import { TransactionCard } from "./TransactionCard";
import { EnergyFlowVisualization } from "./EnergyFlowVisualization";
import { SystemStatus } from "./SystemStatus";
import { MLModelStatus } from "./MLModelStatus";
import { RevenuePanel } from "./RevenuePanel";
import { useSmartGridData } from "@/hooks/useSmartGridData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Zap, Battery, Home, TrendingUp, History, Car, Building2 } from "lucide-react";

export function Dashboard() {
  const { nanogrids, transactions, systemStatus, loading, error } = useSmartGridData();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">System Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate totals with defensive checks
  const totalGeneration = nanogrids.reduce((sum, ng) => sum + (ng?.solar_output ?? 0), 0);
  const totalConsumption = nanogrids.reduce((sum, ng) => sum + (ng?.load_demand ?? 0), 0);
  const totalStorage = nanogrids.reduce((sum, ng) => sum + (ng?.battery_soc ?? 0), 0);
  const totalTrading = nanogrids.reduce((sum, ng) => sum + (ng?.power_balance ?? 0), 0);
  
  // Energy flow allocation (same logic as Digital Twin)
  const netPower = totalGeneration - totalConsumption;
  const avgBatterySoC = totalStorage / (nanogrids.length || 1);
  const batteryCapacity = 50;
  const batteryCanAccept = Math.max(0, (100 - avgBatterySoC) / 100 * batteryCapacity * 0.5);
  const evMaxPower = 15;
  
  let batteryChargePower = 0;
  let evChargePower = 0;
  let gridExport = 0;
  let gridImport = 0;
  
  if (netPower > 0) {
    batteryChargePower = Math.min(netPower, batteryCanAccept);
    const afterBattery = netPower - batteryChargePower;
    evChargePower = Math.min(afterBattery, evMaxPower);
    gridExport = afterBattery - evChargePower;
  } else {
    gridImport = Math.abs(netPower);
  }
  
  // Frequency match indicator
  const frequencyMatch = Math.abs(totalGeneration - totalConsumption) < totalGeneration * 0.1;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnergyCard
            title="Total Generation"
            value={totalGeneration.toFixed(1)}
            unit="kW"
            icon={Zap}
            variant="generation"
            trend="up"
            status="online"
          />
          <EnergyCard
            title="Total Consumption"
            value={totalConsumption.toFixed(1)}
            unit="kW"
            icon={Home}
            variant="consumption"
            trend="stable"
            status="online"
          />
          <EnergyCard
            title="Total Storage"
            value={totalStorage.toFixed(1)}
            unit="kWh"
            icon={Battery}
            variant="storage"
            trend="up"
            status="online"
          />
          <EnergyCard
            title="Active Trading"
            value={Math.abs(totalTrading).toFixed(1)}
            unit="kW"
            icon={TrendingUp}
            variant="trading"
            trend={totalTrading > 0 ? "up" : "down"}
            status="online"
          />
        </div>

        {/* Energy Flow Distribution Panel */}
        <Card className="bg-gradient-card border-2 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-energy-generation" />
              Real-Time Energy Flow Distribution
              <span className={`ml-auto text-sm px-2 py-1 rounded ${frequencyMatch ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                {frequencyMatch ? 'Frequency Matched' : 'Frequency Mismatch'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Battery Storage */}
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Battery className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Battery Storage</span>
                </div>
                <div className="text-2xl font-bold text-green-500">{batteryChargePower.toFixed(1)} kW</div>
                <div className="text-sm text-muted-foreground">Charging Power</div>
                <Progress value={avgBatterySoC} className="h-2 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">{avgBatterySoC.toFixed(0)}% SoC</div>
              </div>

              {/* Grid Export/Import */}
              <div className={`p-4 rounded-lg ${gridExport > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-red-500/10 border-red-500/30'} border`}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className={`h-5 w-5 ${gridExport > 0 ? 'text-blue-500' : 'text-red-500'}`} />
                  <span className="font-medium">{gridExport > 0 ? 'Grid Export' : 'Grid Import'}</span>
                </div>
                <div className={`text-2xl font-bold ${gridExport > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {(gridExport > 0 ? gridExport : gridImport).toFixed(1)} kW
                </div>
                <div className="text-sm text-muted-foreground">
                  {gridExport > 0 ? 'Selling to State Grid' : 'Buying from State Grid'}
                </div>
              </div>

              {/* EV Charging */}
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">EV Station Sales</span>
                </div>
                <div className="text-2xl font-bold text-purple-500">{evChargePower.toFixed(1)} kW</div>
                <div className="text-sm text-muted-foreground">Power to EV Charging</div>
                <div className="text-xs text-muted-foreground mt-2">Global Welfare</div>
              </div>

              {/* Net Power Balance */}
              <div className={`p-4 rounded-lg ${netPower >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-orange-500/10 border-orange-500/30'} border`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`h-5 w-5 ${netPower >= 0 ? 'text-emerald-500' : 'text-orange-500'}`} />
                  <span className="font-medium">Net Balance</span>
                </div>
                <div className={`text-2xl font-bold ${netPower >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {netPower >= 0 ? '+' : ''}{netPower.toFixed(1)} kW
                </div>
                <div className="text-sm text-muted-foreground">
                  {netPower >= 0 ? 'Surplus Power' : 'Deficit Power'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Energy Flow Visualization */}
          <div className="lg:col-span-2">
            <EnergyFlowVisualization
              totalGeneration={totalGeneration}
              totalConsumption={totalConsumption}
              totalStorage={totalStorage}
              totalTrading={totalTrading}
            />
          </div>

          {/* System Status & Revenue */}
          <div className="space-y-6">
            <SystemStatus
              mode={systemStatus.mode}
              nanogridsOnline={systemStatus.nanogridsOnline}
              totalNanogrids={systemStatus.totalNanogrids}
              blockchainConnected={systemStatus.blockchainConnected}
              aiControllerActive={systemStatus.aiControllerActive}
            />
            
            {/* ML Model Status */}
            <MLModelStatus />
          </div>
        </div>

        {/* Revenue Tracking */}
        <RevenuePanel 
          gridExportPower={gridExport} 
          evChargePower={evChargePower} 
        />

        {/* Nanogrids and Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nanogrids Grid */}
          <Card className="bg-gradient-card border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-energy-generation" />
                Active Nanogrids ({nanogrids.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {nanogrids.map((nanogrid) => (
                  <NanogridCard key={nanogrid.nanogrid_id} nanogrid={nanogrid} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-gradient-card border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-energy-trading" />
                Recent Transactions ({transactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.slice(0, 8).map((transaction, index) => (
                  <TransactionCard key={index} transaction={transaction} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}