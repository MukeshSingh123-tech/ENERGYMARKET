import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEnergyIntervalData, IntervalRecord } from "@/hooks/useEnergyIntervalData";
import { Download, Play, Square, Trash2, Clock, Zap, Battery, Car } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NanogridData {
  nanogrid_id: number;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
  power_balance: number;
}

interface IntervalDataPanelProps {
  nanogrids: NanogridData[];
  onIntervalDataChange?: (data: IntervalRecord[]) => void;
}

export function IntervalDataPanel({ nanogrids, onIntervalDataChange }: IntervalDataPanelProps) {
  const {
    intervalData,
    isRecording,
    startRecording,
    stopRecording,
    clearData,
    exportToCSV,
    getElapsedTime,
    intervalMinutes,
  } = useEnergyIntervalData(nanogrids, 15);

  const [elapsed, setElapsed] = useState(0);

  // Update parent when interval data changes
  useEffect(() => {
    onIntervalDataChange?.(intervalData);
  }, [intervalData, onIntervalDataChange]);

  // Update elapsed time display
  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsed(getElapsedTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording, getElapsedTime]);

  const handleStartRecording = () => {
    startRecording();
    toast({
      title: "Recording Started",
      description: `Recording 15-minute intervals. Data will be captured every ${intervalMinutes} minutes.`,
    });
  };

  const handleStopRecording = () => {
    stopRecording();
    toast({
      title: "Recording Stopped",
      description: `Captured ${intervalData.length} complete intervals.`,
    });
  };

  const handleExport = () => {
    if (intervalData.length === 0) {
      toast({
        title: "No Data",
        description: "No interval data to export. Start recording first.",
        variant: "destructive",
      });
      return;
    }
    exportToCSV();
    toast({
      title: "Export Complete",
      description: `Exported ${intervalData.length} intervals to CSV.`,
    });
  };

  const handleClear = () => {
    clearData();
    toast({
      title: "Data Cleared",
      description: "All interval data has been cleared.",
    });
  };

  const progressPercent = isRecording ? (elapsed / (intervalMinutes * 60)) * 100 : 0;
  const remainingSeconds = Math.max(0, intervalMinutes * 60 - elapsed);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get latest totals
  const latestRecord = intervalData[intervalData.length - 1];
  const totalBattery = latestRecord?.systemTotals.batteryCharge || 0;
  const totalGridExport = latestRecord?.systemTotals.gridExport || 0;
  const totalEVSales = latestRecord?.systemTotals.evSales || 0;

  return (
    <Card className="bg-gradient-card border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            15-Minute Interval Tracking
          </CardTitle>
          <Badge variant={isRecording ? "default" : "secondary"}>
            {isRecording ? "Recording" : "Idle"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex gap-2">
          {!isRecording ? (
            <Button onClick={handleStartRecording} className="flex-1" variant="default">
              <Play className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button onClick={handleStopRecording} className="flex-1" variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}
          <Button onClick={handleExport} variant="outline" disabled={intervalData.length === 0}>
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={handleClear} variant="outline" disabled={intervalData.length === 0}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current Interval Progress</span>
              <span>{formatTime(remainingSeconds)} remaining</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-2xl font-bold">{intervalData.length}</div>
            <div className="text-xs text-muted-foreground">Intervals Recorded</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="text-2xl font-bold">{intervalData.length * 15}</div>
            <div className="text-xs text-muted-foreground">Minutes of Data</div>
          </div>
        </div>

        {/* Energy Flow Summary */}
        {intervalData.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Latest Interval Summary</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-green-500/20">
                <Battery className="h-4 w-4 mx-auto mb-1 text-green-500" />
                <div className="text-sm font-bold">{totalBattery.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">kWh Stored</div>
              </div>
              <div className="p-2 rounded bg-blue-500/20">
                <Zap className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <div className="text-sm font-bold">{totalGridExport.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">kWh to Grid</div>
              </div>
              <div className="p-2 rounded bg-purple-500/20">
                <Car className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                <div className="text-sm font-bold">{totalEVSales.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">kWh to EV</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
