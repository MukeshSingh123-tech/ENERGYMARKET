import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { Download, Circle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NanogridData {
  nanogrid_id: number;
  address: string;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
  power_balance: number;
}

interface RealTimeDataPoint {
  timestamp: number;
  time: string;
  ng1_solar: number;
  ng1_load: number;
  ng1_balance: number;
  ng2_solar: number;
  ng2_load: number;
  ng2_balance: number;
  ng3_solar: number;
  ng3_load: number;
  ng3_balance: number;
  ng4_solar: number;
  ng4_load: number;
  ng4_balance: number;
  ng5_solar: number;
  ng5_load: number;
  ng5_balance: number;
  totalGen: number;
  totalDemand: number;
  totalBalance: number;
}

interface RealTimeNanogridChartProps {
  nanogrids: NanogridData[];
}

const COLORS = {
  ng1: '#f59e0b',
  ng2: '#22c55e', 
  ng3: '#3b82f6',
  ng4: '#ef4444',
  ng5: '#8b5cf6'
};

const MAX_DATA_POINTS = 120; // Keep 2 minutes of data at 1-second intervals

export function RealTimeNanogridChart({ nanogrids }: RealTimeNanogridChartProps) {
  const [chartData, setChartData] = useState<RealTimeDataPoint[]>([]);
  const [isRecording, setIsRecording] = useState(true);
  const [recordedCount, setRecordedCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const captureDataPoint = useCallback((): RealTimeDataPoint => {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    const getNanogridData = (id: number) => {
      const ng = nanogrids.find(n => n.nanogrid_id === id);
      return ng || { solar_output: 0, load_demand: 0, power_balance: 0 };
    };

    const ng1 = getNanogridData(1);
    const ng2 = getNanogridData(2);
    const ng3 = getNanogridData(3);
    const ng4 = getNanogridData(4);
    const ng5 = getNanogridData(5);

    const totalGen = ng1.solar_output + ng2.solar_output + ng3.solar_output + ng4.solar_output + ng5.solar_output;
    const totalDemand = ng1.load_demand + ng2.load_demand + ng3.load_demand + ng4.load_demand + ng5.load_demand;

    return {
      timestamp: now,
      time: timeStr,
      ng1_solar: ng1.solar_output,
      ng1_load: ng1.load_demand,
      ng1_balance: ng1.power_balance,
      ng2_solar: ng2.solar_output,
      ng2_load: ng2.load_demand,
      ng2_balance: ng2.power_balance,
      ng3_solar: ng3.solar_output,
      ng3_load: ng3.load_demand,
      ng3_balance: ng3.power_balance,
      ng4_solar: ng4.solar_output,
      ng4_load: ng4.load_demand,
      ng4_balance: ng4.power_balance,
      ng5_solar: ng5.solar_output,
      ng5_load: ng5.load_demand,
      ng5_balance: ng5.power_balance,
      totalGen,
      totalDemand,
      totalBalance: totalGen - totalDemand
    };
  }, [nanogrids]);

  // Auto-start recording on component mount
  useEffect(() => {
    if (isRecording && nanogrids.length > 0) {
      intervalRef.current = setInterval(() => {
        const dataPoint = captureDataPoint();
        setChartData(prev => {
          const newData = [...prev, dataPoint];
          // Keep only last MAX_DATA_POINTS
          if (newData.length > MAX_DATA_POINTS) {
            return newData.slice(-MAX_DATA_POINTS);
          }
          return newData;
        });
        setRecordedCount(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, nanogrids.length, captureDataPoint]);

  const toggleRecording = () => {
    setIsRecording(prev => !prev);
  };

  const downloadCSV = useCallback(() => {
    if (chartData.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to download",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Timestamp', 'Time',
      'NG1 Solar (kW)', 'NG1 Load (kW)', 'NG1 Balance (kW)',
      'NG2 Solar (kW)', 'NG2 Load (kW)', 'NG2 Balance (kW)',
      'NG3 Solar (kW)', 'NG3 Load (kW)', 'NG3 Balance (kW)',
      'NG4 Solar (kW)', 'NG4 Load (kW)', 'NG4 Balance (kW)',
      'NG5 Solar (kW)', 'NG5 Load (kW)', 'NG5 Balance (kW)',
      'Total Generation (kW)', 'Total Demand (kW)', 'Total Balance (kW)'
    ];

    const rows = chartData.map(d => [
      new Date(d.timestamp).toISOString(),
      d.time,
      d.ng1_solar.toFixed(2), d.ng1_load.toFixed(2), d.ng1_balance.toFixed(2),
      d.ng2_solar.toFixed(2), d.ng2_load.toFixed(2), d.ng2_balance.toFixed(2),
      d.ng3_solar.toFixed(2), d.ng3_load.toFixed(2), d.ng3_balance.toFixed(2),
      d.ng4_solar.toFixed(2), d.ng4_load.toFixed(2), d.ng4_balance.toFixed(2),
      d.ng5_solar.toFixed(2), d.ng5_load.toFixed(2), d.ng5_balance.toFixed(2),
      d.totalGen.toFixed(2), d.totalDemand.toFixed(2), d.totalBalance.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanogrid_realtime_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: `Exported ${chartData.length} data points to CSV`
    });
  }, [chartData]);

  const clearData = () => {
    setChartData([]);
    setRecordedCount(0);
    toast({
      title: "Data Cleared",
      description: "Real-time chart data has been cleared"
    });
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="bg-gradient-card border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Circle className={`h-3 w-3 ${isRecording ? 'fill-green-500 text-green-500 animate-pulse' : 'fill-muted text-muted'}`} />
              Real-Time Recording (1-second intervals)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {recordedCount} samples
              </Badge>
              <Badge variant={isRecording ? "default" : "secondary"}>
                {isRecording ? "Recording" : "Paused"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={toggleRecording}
              variant={isRecording ? "destructive" : "default"}
              size="sm"
            >
              {isRecording ? "Pause" : "Resume"}
            </Button>
            <Button onClick={downloadCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Download CSV
            </Button>
            <Button onClick={clearData} variant="ghost" size="sm">
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Combined Solar Output Chart */}
      <Card className="bg-gradient-card border-2">
        <CardHeader>
          <CardTitle className="text-lg">Combined Solar Output - All Nanogrids</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="ng1_solar" name="NG1 Solar" stroke={COLORS.ng1} fill={COLORS.ng1} fillOpacity={0.3} stackId="1" />
              <Area type="monotone" dataKey="ng2_solar" name="NG2 Solar" stroke={COLORS.ng2} fill={COLORS.ng2} fillOpacity={0.3} stackId="1" />
              <Area type="monotone" dataKey="ng3_solar" name="NG3 Solar" stroke={COLORS.ng3} fill={COLORS.ng3} fillOpacity={0.3} stackId="1" />
              <Area type="monotone" dataKey="ng4_solar" name="NG4 Solar" stroke={COLORS.ng4} fill={COLORS.ng4} fillOpacity={0.3} stackId="1" />
              <Area type="monotone" dataKey="ng5_solar" name="NG5 Solar" stroke={COLORS.ng5} fill={COLORS.ng5} fillOpacity={0.3} stackId="1" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Combined Load Demand Chart */}
      <Card className="bg-gradient-card border-2">
        <CardHeader>
          <CardTitle className="text-lg">Combined Load Demand - All Nanogrids</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Load (kW)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="ng1_load" name="NG1 Load" stroke={COLORS.ng1} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng2_load" name="NG2 Load" stroke={COLORS.ng2} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng3_load" name="NG3 Load" stroke={COLORS.ng3} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng4_load" name="NG4 Load" stroke={COLORS.ng4} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng5_load" name="NG5 Load" stroke={COLORS.ng5} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Total Generation vs Demand Chart */}
      <Card className="bg-gradient-card border-2">
        <CardHeader>
          <CardTitle className="text-lg">System Total: Generation vs Demand</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="totalGen" name="Total Generation" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} />
              <Area type="monotone" dataKey="totalDemand" name="Total Demand" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Power Balance Chart */}
      <Card className="bg-gradient-card border-2">
        <CardHeader>
          <CardTitle className="text-lg">Power Balance per Nanogrid</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Balance (kW)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="ng1_balance" name="NG1 Balance" stroke={COLORS.ng1} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng2_balance" name="NG2 Balance" stroke={COLORS.ng2} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng3_balance" name="NG3 Balance" stroke={COLORS.ng3} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng4_balance" name="NG4 Balance" stroke={COLORS.ng4} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ng5_balance" name="NG5 Balance" stroke={COLORS.ng5} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="totalBalance" name="System Balance" stroke="#ffffff" strokeWidth={3} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
