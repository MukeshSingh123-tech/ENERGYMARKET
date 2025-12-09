import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  BarChart, Bar, ComposedChart, Area 
} from "recharts";
import { Calendar, TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NanogridData {
  nanogrid_id: number;
  address: string;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
  power_balance: number;
}

interface HistoricalComparisonChartProps {
  nanogrids: NanogridData[];
}

const COLORS = {
  today: '#22c55e',
  yesterday: '#3b82f6',
  twoDaysAgo: '#f59e0b',
  threeDaysAgo: '#8b5cf6',
  average: '#ef4444'
};

// Generate historical data based on current data with variations
const generateHistoricalData = (nanogrids: NanogridData[], daysAgo: number) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const variation = 1 - (daysAgo * 0.05); // Slight decrease for older days
  
  return hours.map(hour => {
    const sunFactor = Math.sin((hour - 6) * Math.PI / 12);
    const sunMultiplier = hour >= 6 && hour <= 18 ? Math.max(0, sunFactor) : 0;
    const loadFactor = 0.6 + 0.4 * Math.sin((hour - 8) * Math.PI / 16);
    
    const data: Record<string, any> = { hour: `${hour}:00` };
    let totalGen = 0;
    let totalLoad = 0;
    
    nanogrids.forEach(ng => {
      const baseSolar = ng.solar_output * variation;
      const baseLoad = ng.load_demand * variation;
      const randomVariation = 0.8 + Math.random() * 0.4;
      
      const solar = baseSolar * sunMultiplier * randomVariation;
      const load = baseLoad * loadFactor * randomVariation;
      
      data[`ng${ng.nanogrid_id}_solar`] = parseFloat(solar.toFixed(2));
      data[`ng${ng.nanogrid_id}_load`] = parseFloat(load.toFixed(2));
      data[`ng${ng.nanogrid_id}_balance`] = parseFloat((solar - load).toFixed(2));
      
      totalGen += solar;
      totalLoad += load;
    });
    
    data.totalGen = parseFloat(totalGen.toFixed(2));
    data.totalLoad = parseFloat(totalLoad.toFixed(2));
    data.totalBalance = parseFloat((totalGen - totalLoad).toFixed(2));
    
    return data;
  });
};

const getDayLabel = (daysAgo: number): string => {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export function HistoricalComparisonChart({ nanogrids }: HistoricalComparisonChartProps) {
  const [comparisonDays, setComparisonDays] = useState<number[]>([0, 1]);
  const [selectedMetric, setSelectedMetric] = useState<'solar' | 'load' | 'balance'>('solar');
  const [selectedNanogrid, setSelectedNanogrid] = useState<number | 'all'>('all');

  // Generate data for each day
  const historicalData = useMemo(() => {
    const data: Record<number, any[]> = {};
    for (let i = 0; i <= 7; i++) {
      data[i] = generateHistoricalData(nanogrids, i);
    }
    return data;
  }, [nanogrids]);

  // Calculate daily totals for summary
  const dailyTotals = useMemo(() => {
    return Array.from({ length: 8 }, (_, daysAgo) => {
      const dayData = historicalData[daysAgo];
      const totalGen = dayData.reduce((sum, h) => sum + h.totalGen, 0);
      const totalLoad = dayData.reduce((sum, h) => sum + h.totalLoad, 0);
      const avgBalance = dayData.reduce((sum, h) => sum + h.totalBalance, 0) / 24;
      
      return {
        day: getDayLabel(daysAgo),
        daysAgo,
        totalGeneration: parseFloat(totalGen.toFixed(1)),
        totalConsumption: parseFloat(totalLoad.toFixed(1)),
        avgBalance: parseFloat(avgBalance.toFixed(2)),
        netEnergy: parseFloat((totalGen - totalLoad).toFixed(1))
      };
    });
  }, [historicalData]);

  // Merge data for comparison chart
  const comparisonChartData = useMemo(() => {
    const baseData = historicalData[comparisonDays[0]];
    return baseData.map((hourData, idx) => {
      const merged: Record<string, any> = { hour: hourData.hour };
      
      comparisonDays.forEach((day, dayIdx) => {
        const dayData = historicalData[day][idx];
        const dayLabel = day === 0 ? 'today' : day === 1 ? 'yesterday' : `day${day}`;
        
        if (selectedNanogrid === 'all') {
          merged[`${dayLabel}_${selectedMetric}`] = selectedMetric === 'solar' 
            ? dayData.totalGen 
            : selectedMetric === 'load' 
              ? dayData.totalLoad 
              : dayData.totalBalance;
        } else {
          merged[`${dayLabel}_${selectedMetric}`] = dayData[`ng${selectedNanogrid}_${selectedMetric}`];
        }
      });
      
      return merged;
    });
  }, [historicalData, comparisonDays, selectedMetric, selectedNanogrid]);

  const toggleDay = (day: number) => {
    if (comparisonDays.includes(day)) {
      if (comparisonDays.length > 1) {
        setComparisonDays(comparisonDays.filter(d => d !== day));
      }
    } else {
      if (comparisonDays.length < 4) {
        setComparisonDays([...comparisonDays, day].sort((a, b) => a - b));
      }
    }
  };

  const getChangeIndicator = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return { icon: Minus, color: 'text-muted-foreground', text: '~0%' };
    if (change > 0) return { icon: TrendingUp, color: 'text-green-500', text: `+${change.toFixed(1)}%` };
    return { icon: TrendingDown, color: 'text-red-500', text: `${change.toFixed(1)}%` };
  };

  const downloadComparison = () => {
    const headers = ['Hour', ...comparisonDays.map(d => `${getDayLabel(d)} ${selectedMetric}`)];
    const rows = comparisonChartData.map(d => {
      const row = [d.hour];
      comparisonDays.forEach(day => {
        const dayLabel = day === 0 ? 'today' : day === 1 ? 'yesterday' : `day${day}`;
        row.push(d[`${dayLabel}_${selectedMetric}`]?.toFixed(2) || '0');
      });
      return row;
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historical_comparison_${selectedMetric}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: "Historical comparison data exported to CSV"
    });
  };

  const todayTotal = dailyTotals[0];
  const yesterdayTotal = dailyTotals[1];
  const genChange = getChangeIndicator(todayTotal.totalGeneration, yesterdayTotal.totalGeneration);
  const loadChange = getChangeIndicator(todayTotal.totalConsumption, yesterdayTotal.totalConsumption);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Today's Generation</div>
            <div className="text-2xl font-bold">{todayTotal.totalGeneration} kWh</div>
            <div className={`flex items-center gap-1 text-sm ${genChange.color}`}>
              <genChange.icon className="h-4 w-4" />
              <span>{genChange.text} vs yesterday</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Today's Consumption</div>
            <div className="text-2xl font-bold">{todayTotal.totalConsumption} kWh</div>
            <div className={`flex items-center gap-1 text-sm ${loadChange.color}`}>
              <loadChange.icon className="h-4 w-4" />
              <span>{loadChange.text} vs yesterday</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Net Energy</div>
            <div className={`text-2xl font-bold ${todayTotal.netEnergy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {todayTotal.netEnergy >= 0 ? '+' : ''}{todayTotal.netEnergy} kWh
            </div>
            <div className="text-sm text-muted-foreground">
              {todayTotal.netEnergy >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">7-Day Avg Balance</div>
            <div className="text-2xl font-bold">
              {(dailyTotals.reduce((sum, d) => sum + d.avgBalance, 0) / 8).toFixed(1)} kW
            </div>
            <div className="text-sm text-muted-foreground">Average hourly</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="bg-gradient-card border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historical Comparison
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedMetric} onValueChange={(v: any) => setSelectedMetric(v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solar">Solar Output</SelectItem>
                  <SelectItem value="load">Load Demand</SelectItem>
                  <SelectItem value="balance">Power Balance</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={String(selectedNanogrid)} onValueChange={(v) => setSelectedNanogrid(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nanogrids</SelectItem>
                  {nanogrids.map(ng => (
                    <SelectItem key={ng.nanogrid_id} value={String(ng.nanogrid_id)}>
                      Nanogrid {ng.nanogrid_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={downloadComparison}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Day Selection */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground mr-2">Compare days:</span>
            {Array.from({ length: 8 }, (_, i) => (
              <Badge 
                key={i}
                variant={comparisonDays.includes(i) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleDay(i)}
              >
                {getDayLabel(i)}
              </Badge>
            ))}
          </div>
          
          {/* Comparison Chart */}
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={comparisonChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="hour" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ 
                  value: selectedMetric === 'solar' ? 'kW' : selectedMetric === 'load' ? 'kW' : 'kW', 
                  angle: -90, 
                  position: 'insideLeft', 
                  fill: 'hsl(var(--muted-foreground))' 
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              
              {comparisonDays.map((day, idx) => {
                const dayLabel = day === 0 ? 'today' : day === 1 ? 'yesterday' : `day${day}`;
                const colors = [COLORS.today, COLORS.yesterday, COLORS.twoDaysAgo, COLORS.threeDaysAgo];
                return (
                  <Line
                    key={day}
                    type="monotone"
                    dataKey={`${dayLabel}_${selectedMetric}`}
                    name={getDayLabel(day)}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={day === 0 ? 3 : 2}
                    strokeDasharray={day === 0 ? undefined : "5 5"}
                    dot={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Totals Bar Chart */}
      <Card className="bg-gradient-card border-2">
        <CardHeader>
          <CardTitle className="text-lg">7-Day Energy Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyTotals.slice().reverse()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="totalGeneration" name="Generation" fill={COLORS.today} radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalConsumption" name="Consumption" fill={COLORS.average} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Net Energy Trend */}
      <Card className="bg-gradient-card border-2">
        <CardHeader>
          <CardTitle className="text-lg">Net Energy Trend (Generation - Consumption)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={dailyTotals.slice().reverse()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'kWh', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="netEnergy" 
                name="Net Energy" 
                fill={COLORS.today}
                fillOpacity={0.3}
                stroke={COLORS.today}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="avgBalance" 
                name="Avg Hourly Balance" 
                stroke={COLORS.yesterday}
                strokeWidth={2}
                dot={{ fill: COLORS.yesterday }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
