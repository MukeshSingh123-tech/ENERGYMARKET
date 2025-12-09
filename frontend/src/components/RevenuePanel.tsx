import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRevenueTracking, PricingConfig } from "@/hooks/useRevenueTracking";
import { 
  DollarSign, 
  TrendingUp, 
  Download, 
  Play, 
  Square, 
  Settings2,
  Zap,
  Car,
  Calendar,
  Clock
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

interface RevenuePanelProps {
  gridExportPower: number;
  evChargePower: number;
}

export function RevenuePanel({ gridExportPower, evChargePower }: RevenuePanelProps) {
  const {
    revenueHistory,
    dailySummaries,
    isTracking,
    currentPricing,
    getCurrentPrices,
    getSessionTotals,
    getMonthlyProjection,
    startTracking,
    stopTracking,
    updatePricing,
    exportToCSV,
  } = useRevenueTracking(gridExportPower, evChargePower);

  const [showPricingSettings, setShowPricingSettings] = useState(false);
  const [tempPricing, setTempPricing] = useState<PricingConfig>(currentPricing);

  const currentPrices = getCurrentPrices();
  const sessionTotals = getSessionTotals();
  const projection = getMonthlyProjection();

  // Real-time revenue calculation (instant, not accumulated)
  const instantGridRevenue = gridExportPower * currentPrices.gridPrice;
  const instantEvRevenue = evChargePower * currentPrices.evPrice;
  const instantTotalRevenue = instantGridRevenue + instantEvRevenue;

  const handleSavePricing = () => {
    updatePricing(tempPricing);
    setShowPricingSettings(false);
  };

  // Chart data for revenue over time
  const chartData = revenueHistory.slice(-60).map((record, idx) => ({
    time: new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    grid: record.gridRevenue * 1000, // Convert to cents for visibility
    ev: record.evRevenue * 1000,
    total: record.totalRevenue * 1000,
  }));

  return (
    <Card className="bg-gradient-card border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-green-500" />
            Revenue Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={currentPrices.isPeak ? "default" : "secondary"}>
              {currentPrices.isPeak ? "Peak Hours" : "Off-Peak"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPricingSettings(!showPricingSettings)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="realtime">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="realtime">Real-Time</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="projection">Projection</TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="space-y-4">
            {/* Current Prices */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Grid Price</span>
                </div>
                <div className="text-xl font-bold text-blue-500">
                  ${currentPrices.gridPrice.toFixed(3)}/kWh
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="h-4 w-4 text-purple-500" />
                  <span>EV Price</span>
                </div>
                <div className="text-xl font-bold text-purple-500">
                  ${currentPrices.evPrice.toFixed(3)}/kWh
                </div>
              </div>
            </div>

            {/* Instant Revenue Rate */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Current Revenue Rate</span>
                <Badge variant="outline" className="text-green-500">Live</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-500">${instantGridRevenue.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground">Grid/hr</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-500">${instantEvRevenue.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground">EV/hr</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-500">${instantTotalRevenue.toFixed(3)}</div>
                  <div className="text-xs text-muted-foreground">Total/hr</div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!isTracking ? (
                <Button onClick={startTracking} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Start Tracking
                </Button>
              ) : (
                <Button onClick={stopTracking} variant="destructive" className="flex-1">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Tracking
                </Button>
              )}
              <Button onClick={exportToCSV} variant="outline" disabled={revenueHistory.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Revenue Chart */}
            {chartData.length > 0 && (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${(value / 1000).toFixed(4)}$`, '']}
                    />
                    <Line type="monotone" dataKey="grid" name="Grid" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ev" name="EV" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {/* Session Totals */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Session Totals
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Grid Export</div>
                  <div className="font-bold">{sessionTotals.gridExportKwh.toFixed(3)} kWh</div>
                  <div className="text-green-500">${sessionTotals.gridRevenue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">EV Sales</div>
                  <div className="font-bold">{sessionTotals.evSalesKwh.toFixed(3)} kWh</div>
                  <div className="text-green-500">${sessionTotals.evRevenue.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-xl font-bold text-green-500">${sessionTotals.totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Daily Summaries */}
            {dailySummaries.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Daily Breakdown
                </h4>
                {dailySummaries.map((summary, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{summary.date}</span>
                      <span className="text-green-500 font-bold">${summary.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>Grid: {summary.gridExportKwh.toFixed(2)} kWh</div>
                      <div>EV: {summary.evSalesKwh.toFixed(2)} kWh</div>
                      <div>Avg: ${summary.avgPricePerKwh.toFixed(3)}/kWh</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="projection" className="space-y-4">
            {projection ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                    <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-500">${projection.dailyRevenue}</div>
                    <div className="text-sm text-muted-foreground">Daily Estimate</div>
                    <div className="text-xs text-muted-foreground mt-1">{projection.dailyKwh} kWh</div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                    <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-500">${projection.monthlyRevenue}</div>
                    <div className="text-sm text-muted-foreground">Monthly Estimate</div>
                    <div className="text-xs text-muted-foreground mt-1">{projection.monthlyKwh} kWh</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Based on current power output and pricing rates
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start tracking to see revenue projections</p>
                <p className="text-xs mt-1">Need at least 10 minutes of data</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Pricing Settings */}
        {showPricingSettings && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium">Pricing Configuration</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Grid Price ($/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tempPricing.gridPricePerKwh}
                  onChange={(e) => setTempPricing(p => ({ ...p, gridPricePerKwh: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-xs">EV Price ($/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tempPricing.evPricePerKwh}
                  onChange={(e) => setTempPricing(p => ({ ...p, evPricePerKwh: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-xs">Peak Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={tempPricing.peakMultiplier}
                  onChange={(e) => setTempPricing(p => ({ ...p, peakMultiplier: parseFloat(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label className="text-xs">Peak Hours (Start-End)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={tempPricing.peakHoursStart}
                    onChange={(e) => setTempPricing(p => ({ ...p, peakHoursStart: parseInt(e.target.value) || 0 }))}
                  />
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={tempPricing.peakHoursEnd}
                    onChange={(e) => setTempPricing(p => ({ ...p, peakHoursEnd: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSavePricing} size="sm" className="flex-1">Save</Button>
              <Button onClick={() => setShowPricingSettings(false)} variant="outline" size="sm">Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
