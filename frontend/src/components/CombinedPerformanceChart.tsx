import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { IntervalRecord } from "@/hooks/useEnergyIntervalData";

interface CombinedPerformanceChartProps {
  intervalData: IntervalRecord[];
  nanogrids: { nanogrid_id: number }[];
}

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6'];

export function CombinedPerformanceChart({ intervalData, nanogrids }: CombinedPerformanceChartProps) {
  // Transform interval data for chart
  const chartData = intervalData.map((record, idx) => {
    const dataPoint: Record<string, number | string> = {
      interval: `${idx + 1}`,
      time: new Date(record.intervalStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    
    record.nanogrids.forEach(ng => {
      dataPoint[`ng${ng.nanogrid_id}_solar`] = ng.avgSolarOutput;
      dataPoint[`ng${ng.nanogrid_id}_load`] = ng.avgLoadDemand;
      dataPoint[`ng${ng.nanogrid_id}_balance`] = ng.avgPowerBalance;
      dataPoint[`ng${ng.nanogrid_id}_energy`] = ng.totalEnergyGenerated;
    });
    
    dataPoint['totalGen'] = record.systemTotals.totalGeneration;
    dataPoint['totalDemand'] = record.systemTotals.totalDemand;
    
    return dataPoint;
  });

  if (chartData.length === 0) {
    return (
      <Card className="bg-gradient-card border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg">Combined Nanogrid Performance (15-min intervals)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Start recording to see combined performance data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg">Combined Nanogrid Performance (15-min intervals)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
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
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            
            {/* Total lines */}
            <Line 
              type="monotone" 
              dataKey="totalGen" 
              name="Total Generation"
              stroke="#22c55e" 
              strokeWidth={3}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="totalDemand" 
              name="Total Demand"
              stroke="#ef4444" 
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={false}
            />
            
            {/* Individual nanogrid lines */}
            {nanogrids.map((ng, idx) => (
              <Line
                key={ng.nanogrid_id}
                type="monotone"
                dataKey={`ng${ng.nanogrid_id}_solar`}
                name={`NG${ng.nanogrid_id} Solar`}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                opacity={0.7}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
