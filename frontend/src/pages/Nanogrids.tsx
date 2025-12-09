import { useState, useEffect, useCallback } from "react";
import { useSmartGridData } from "@/hooks/useSmartGridData";
import { useEnhancedGridData } from "@/hooks/useEnhancedGridData";
import { useWeb3 } from "@/hooks/useWeb3";
import { useBlockchainIntervalRecording } from "@/hooks/useBlockchainIntervalRecording";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AIPredictionPanel } from "@/components/AIPredictionPanel";
import { toast } from "@/hooks/use-toast";
import { 
  Zap, 
  Battery, 
  Sun, 
  Home, 
  TrendingUp, 
  AlertTriangle,
  Settings,
  Activity,
  BarChart3,
  UserPlus,
  Upload,
  Brain,
  Trophy,
  Leaf,
  Award,
  Clock,
  Download,
  Circle
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ForecastingChart } from "@/components/ForecastingChart";
import NanogridAssistant from "@/components/NanogridAssistant";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { AutomationRules } from "@/components/AutomationRules";
import { Leaderboard } from "@/components/Leaderboard";
import { CarbonImpactDashboard } from "@/components/CarbonImpactDashboard";
import { AchievementsBadges } from "@/components/AchievementsBadges";
import { IntervalDataPanel } from "@/components/IntervalDataPanel";
import { CombinedPerformanceChart } from "@/components/CombinedPerformanceChart";
import { RealTimeNanogridChart } from "@/components/RealTimeNanogridChart";
import { HistoricalComparisonChart } from "@/components/HistoricalComparisonChart";
import { IntervalRecord } from "@/hooks/useEnergyIntervalData";
import { NANOGRID_ADDRESSES } from "@/blockchain/config";

const Nanogrids = () => {
  const { nanogrids, loading, error } = useSmartGridData();
  const { nanogrids: enhancedNanogrids, loading: enhancedLoading } = useEnhancedGridData();
  const { 
    walletState, 
    registerProsumer, 
    reportEnergySurplus, 
    getEnergyBalance,
    isBlockchainConnected
  } = useWeb3();
  
  const {
    isRecording,
    progress,
    currentInterval,
    intervalHistory,
    startRecording,
    stopRecording,
    exportToCSV
  } = useBlockchainIntervalRecording(nanogrids);
  
  const [selectedNanogrid, setSelectedNanogrid] = useState<number | null>(null);
  const [energyBalance, setEnergyBalance] = useState<number>(0);
  const [surplusAmount, setSurplusAmount] = useState<string>("");
  const [intervalData, setIntervalData] = useState<IntervalRecord[]>([]);

  const handleIntervalDataChange = useCallback((data: IntervalRecord[]) => {
    setIntervalData(data);
  }, []);

  // Load energy balance when wallet connects
  useEffect(() => {
    const loadBalance = async () => {
      if (walletState.isConnected && walletState.address) {
        try {
          const balance = await getEnergyBalance();
          setEnergyBalance(balance);
        } catch (error) {
          console.error('Failed to load energy balance:', error);
        }
      }
    };
    
    loadBalance();
  }, [walletState.isConnected, walletState.address, getEnergyBalance]);

  // Handle prosumer registration
  const handleRegisterProsumer = async () => {
    try {
      await registerProsumer();
      toast({
        title: "Registration Successful",
        description: "You are now registered as a prosumer!",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register as prosumer",
        variant: "destructive",
      });
    }
  };

  // Handle energy surplus reporting
  const handleReportSurplus = async () => {
    if (!surplusAmount || parseFloat(surplusAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid energy amount",
        variant: "destructive",
      });
      return;
    }

    try {
      await reportEnergySurplus(parseFloat(surplusAmount));
      setSurplusAmount("");
      
      // Refresh balance
      const newBalance = await getEnergyBalance();
      setEnergyBalance(newBalance);
      
      toast({
        title: "Energy Reported",
        description: `Successfully reported ${surplusAmount} kWh surplus`,
      });
    } catch (error: any) {
      toast({
        title: "Report Failed",
        description: error.message || "Failed to report energy surplus",
        variant: "destructive",
      });
    }
  };

  // Mock historical data for charts
  const generateMockData = (baseValue: number) => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      value: baseValue + Math.sin(i / 4) * 20 + Math.random() * 10,
    }));
  };

  if (loading || enhancedLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">{error}</p>
      </div>
    </div>
  );

  const selectedNanogridData = nanogrids.find(n => n.nanogrid_id === selectedNanogrid);
  const selectedEnhancedData = enhancedNanogrids.find(n => n.nanogrid_id === selectedNanogrid);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nanogrids Management</h1>
          <p className="text-muted-foreground">Monitor and control your distributed energy resources</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {nanogrids.length} Active Nanogrids
        </Badge>
      </div>

      {/* Web3 Controls */}
      {walletState.isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Prosumer Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserPlus className="h-4 w-4" />
                Prosumer Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {walletState.isProsumer ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-gradient-energy-primary">
                    Registered Prosumer
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Register to start trading energy</p>
                  <Button 
                    onClick={handleRegisterProsumer}
                    disabled={walletState.isLoading}
                    size="sm"
                    className="w-full"
                  >
                    {walletState.isLoading ? "Registering..." : "Register as Prosumer"}
                  </Button>
                  {walletState.error && (
                    <p className="text-xs text-destructive">{walletState.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Energy Balance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                Energy Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{energyBalance.toFixed(2)} kWh</div>
              <p className="text-sm text-muted-foreground">Available for trading</p>
            </CardContent>
          </Card>

          {/* Report Surplus */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                Report Energy Surplus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="surplus-amount">Amount (kWh)</Label>
                <Input
                  id="surplus-amount"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Enter surplus amount"
                  value={surplusAmount}
                  onChange={(e) => setSurplusAmount(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleReportSurplus}
                disabled={!walletState.isProsumer || walletState.isLoading || !surplusAmount}
                size="sm"
                className="w-full"
              >
                Report Surplus
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {!walletState.isConnected && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Zap className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Connect your wallet to access blockchain features</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nanogrids List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Nanogrid Fleet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nanogrids.map((nanogrid) => {
                const isOnline = nanogrid.solar_output > 0 || nanogrid.load_demand > 0;
                const batteryPercentage = (nanogrid.battery_soc / 20) * 100;
                const isGenerating = nanogrid.power_balance > 0;
                
                return (
                  <Card 
                    key={nanogrid.nanogrid_id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedNanogrid === nanogrid.nanogrid_id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedNanogrid(nanogrid.nanogrid_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          <span className="font-medium">Grid {nanogrid.nanogrid_id}</span>
                        </div>
                        <Badge variant={isOnline ? "default" : "secondary"}>
                          {isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Sun className="h-3 w-3" />
                            Solar
                          </span>
                          <span className="font-medium">{nanogrid.solar_output.toFixed(1)} kW</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Battery className="h-3 w-3" />
                            Battery
                          </span>
                          <span className="font-medium">{batteryPercentage.toFixed(0)}%</span>
                        </div>
                        
                        <Progress value={batteryPercentage} className="h-1" />
                        
                        <div className="flex items-center justify-between text-sm">
                          <span>Balance</span>
                          <span className={`font-medium ${isGenerating ? 'text-green-600' : 'text-orange-600'}`}>
                            {isGenerating ? '+' : ''}{nanogrid.power_balance.toFixed(1)} kW
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-2">
          {selectedNanogridData ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex w-full flex-wrap gap-2 bg-transparent border-b border-muted pb-4">
                <TabsTrigger value="overview" className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="realtime" className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  Real-Time
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="intervals" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  15-min
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Perf
                </TabsTrigger>
                <TabsTrigger value="forecast" className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Forecast
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  AI
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="automation" className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Auto
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  Rank
                </TabsTrigger>
                <TabsTrigger value="carbon" className="flex items-center gap-1">
                  <Leaf className="h-4 w-4" />
                  CO2
                </TabsTrigger>
                <TabsTrigger value="achievements" className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  Awards
                </TabsTrigger>
                <TabsTrigger value="control" className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  Control
                </TabsTrigger>
              </TabsList>


              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Overview
                    </CardTitle>
                    <CardDescription>
                      Nanogrid {selectedNanogridData.nanogrid_id} - Live Status | Address: {selectedNanogridData.address.slice(0, 10)}...{selectedNanogridData.address.slice(-8)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <Sun className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <div className="text-2xl font-bold">{selectedNanogridData.solar_output.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">kW Solar</div>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <Home className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <div className="text-2xl font-bold">{selectedNanogridData.load_demand.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">kW Load</div>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <Battery className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <div className="text-2xl font-bold">{selectedNanogridData.battery_soc.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">kWh Stored</div>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                        <div className="text-2xl font-bold">{selectedNanogridData.power_balance.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">kW Balance</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="realtime" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Real-Time Data
                    </CardTitle>
                  </CardHeader>
                </Card>
                <RealTimeNanogridChart nanogrids={nanogrids} />
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      History
                    </CardTitle>
                  </CardHeader>
                </Card>
                <HistoricalComparisonChart nanogrids={nanogrids} />
              </TabsContent>

              <TabsContent value="intervals" className="space-y-4">
                {/* 15-min Intervals Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      15-min Intervals
                    </CardTitle>
                  </CardHeader>
                </Card>
                {/* Blockchain Recording Status */}
                <Card className="bg-gradient-card border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Circle className={`h-3 w-3 ${isRecording ? 'fill-green-500 text-green-500 animate-pulse' : 'fill-muted text-muted'}`} />
                      Blockchain Recording
                      <Badge variant={isBlockchainConnected ? "default" : "secondary"} className="ml-auto">
                        {isBlockchainConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground w-12">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? "destructive" : "default"}
                      >
                        {isRecording ? "Stop" : "Start"} Recording
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-1" />
                        Export CSV
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {intervalHistory.length} intervals recorded • Auto-saves to Ethereum
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1">
                    <IntervalDataPanel 
                      nanogrids={nanogrids} 
                      onIntervalDataChange={handleIntervalDataChange}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <CombinedPerformanceChart 
                      intervalData={intervalData}
                      nanogrids={nanogrids}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                </Card>
                {selectedEnhancedData ? (
                  <PerformanceChart 
                    performance={selectedEnhancedData.performance}
                    nanogridId={selectedNanogridData.nanogrid_id}
                    historicalData={generateMockData(selectedNanogridData.solar_output).map((item, i) => ({
                      hour: item.hour,
                      efficiency: selectedEnhancedData.performance.efficiency + Math.sin(i / 4) * 5,
                      utilization: selectedEnhancedData.performance.utilization + Math.sin(i / 3) * 10,
                      health: selectedEnhancedData.performance.healthScore + Math.sin(i / 5) * 3
                    }))}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>24-Hour Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={generateMockData(selectedNanogridData.solar_output)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary) / 0.2)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="forecast" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Forecast
                    </CardTitle>
                  </CardHeader>
                </Card>
                {selectedEnhancedData ? (
                  <ForecastingChart 
                    forecastData={selectedEnhancedData.forecast}
                    nanogridId={selectedNanogridData.nanogrid_id}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Energy Forecast</CardTitle>
                      <CardDescription>Predicted solar generation for next 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={generateMockData(selectedNanogridData.solar_output * 0.8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--chart-2))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Predictions
                    </CardTitle>
                  </CardHeader>
                </Card>
                <AIPredictionPanel />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Analytics
                    </CardTitle>
                  </CardHeader>
                </Card>
                <AnalyticsDashboard nanogridId={selectedNanogrid!} />
              </TabsContent>

              <TabsContent value="automation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Automation
                    </CardTitle>
                  </CardHeader>
                </Card>
                <AutomationRules nanogridId={selectedNanogrid!} />
              </TabsContent>

              <TabsContent value="leaderboard" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Leaderboard
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Leaderboard />
              </TabsContent>

              <TabsContent value="carbon" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5" />
                      Carbon Impact
                    </CardTitle>
                  </CardHeader>
                </Card>
                <CarbonImpactDashboard nanogridId={selectedNanogrid!} />
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Achievements
                    </CardTitle>
                  </CardHeader>
                </Card>
                <AchievementsBadges />
              </TabsContent>

              <TabsContent value="control" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <Button 
                         variant="outline" 
                         className="justify-start"
                         onClick={handleReportSurplus}
                         disabled={!walletState.isProsumer || !surplusAmount}
                       >
                         <Battery className="h-4 w-4 mr-2" />
                         Report Energy Surplus
                       </Button>
                       
                       <Button 
                         variant="outline" 
                         className="justify-start"
                         onClick={() => {
                           toast({
                             title: "Energy Balance",
                             description: `Your current balance: ${energyBalance.toFixed(2)} kWh`,
                           });
                         }}
                       >
                         <BarChart3 className="h-4 w-4 mr-2" />
                         View Energy Balance
                       </Button>
                       
                       <Button variant="outline" className="justify-start">
                         <Settings className="h-4 w-4 mr-2" />
                         Configure Settings
                       </Button>
                       
                       <Button variant="outline" className="justify-start">
                         <AlertTriangle className="h-4 w-4 mr-2" />
                         Maintenance Mode
                       </Button>
                     </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Quick Actions</h4>
                      <div className="flex gap-2">
                        <Button size="sm">Export Data</Button>
                        <Button size="sm" variant="outline">Reset Counters</Button>
                        <Button size="sm" variant="outline">Emergency Stop</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Select a Nanogrid</h3>
                <p className="text-muted-foreground">Choose a nanogrid from the list to view detailed information</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <NanogridAssistant 
        nanogridContext={selectedNanogridData ? {
          selectedNanogrid: {
            id: selectedNanogridData.nanogrid_id,
            solar_output: selectedNanogridData.solar_output,
            load_demand: selectedNanogridData.load_demand,
            battery_soc: selectedNanogridData.battery_soc,
            power_balance: selectedNanogridData.power_balance,
            address: selectedNanogridData.address,
          },
          enhancedData: selectedEnhancedData,
          totalNanogrids: nanogrids.length,
          allNanogrids: nanogrids.map(n => ({
            id: n.nanogrid_id,
            solar_output: n.solar_output,
            load_demand: n.load_demand,
            battery_soc: n.battery_soc,
            power_balance: n.power_balance,
          }))
        } : {
          totalNanogrids: nanogrids.length,
          allNanogrids: nanogrids.map(n => ({
            id: n.nanogrid_id,
            solar_output: n.solar_output,
            load_demand: n.load_demand,
            battery_soc: n.battery_soc,
            power_balance: n.power_balance,
          }))
        }}
      />
    </div>
  );
};

export default Nanogrids;