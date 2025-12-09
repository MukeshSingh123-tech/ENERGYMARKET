import { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3, BlockchainIntervalRecord } from './useWeb3';
import { toast } from '@/hooks/use-toast';

export interface LiveIntervalData {
  nanogridId: number;
  address: string;
  solarOutput: number;
  loadDemand: number;
  batterySoC: number;
  powerBalance: number;
  gridExport: number;
  evSales: number;
  timestamp: number;
}

export interface AggregatedIntervalData {
  timestamp: number;
  intervalStart: number;
  intervalEnd: number;
  totalGeneration: number;
  totalConsumption: number;
  avgBatterySoC: number;
  totalGridExport: number;
  totalEvSales: number;
  netPowerBalance: number;
  nanogrids: LiveIntervalData[];
}

export const useBlockchainIntervalRecording = (nanogrids: any[]) => {
  const { 
    isBlockchainConnected, 
    walletState,
    recordIntervalData,
    recordRevenue,
    getAllIntervalRecords,
    subscribeToEvents
  } = useWeb3();
  
  const [isRecording, setIsRecording] = useState(false);
  const [currentInterval, setCurrentInterval] = useState<AggregatedIntervalData | null>(null);
  const [intervalHistory, setIntervalHistory] = useState<AggregatedIntervalData[]>([]);
  const [blockchainRecords, setBlockchainRecords] = useState<BlockchainIntervalRecord[]>([]);
  const [progress, setProgress] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const dataAccumulator = useRef<LiveIntervalData[][]>([]);
  
  const INTERVAL_DURATION = 15 * 60 * 1000; // 15 minutes in ms
  const SAMPLE_RATE = 5000; // Sample every 5 seconds

  // Load blockchain records on mount
  useEffect(() => {
    const loadBlockchainData = async () => {
      if (isBlockchainConnected) {
        try {
          const records = await getAllIntervalRecords();
          setBlockchainRecords(records);
        } catch (error) {
          console.error('Failed to load blockchain records:', error);
        }
      }
    };
    
    loadBlockchainData();
  }, [isBlockchainConnected, getAllIntervalRecords]);

  // Subscribe to blockchain events
  useEffect(() => {
    if (!isBlockchainConnected) return;

    const unsubscribe = subscribeToEvents({
      onIntervalRecorded: (nanogridId, solarOutput, loadDemand, timestamp) => {
        console.log('Interval recorded on blockchain:', { nanogridId, solarOutput, loadDemand, timestamp });
        // Refresh blockchain records
        getAllIntervalRecords().then(setBlockchainRecords);
      },
      onRevenueRecorded: (nanogrid, gridRevenue, evRevenue, timestamp) => {
        console.log('Revenue recorded on blockchain:', { nanogrid, gridRevenue, evRevenue, timestamp });
      }
    });

    return unsubscribe;
  }, [isBlockchainConnected, subscribeToEvents, getAllIntervalRecords]);

  // Auto-start recording when frontend loads (nanogrids available)
  useEffect(() => {
    if (!isRecording && nanogrids.length > 0) {
      startRecording();
      toast({
        title: "Auto-Recording Started",
        description: "15-minute interval recording started automatically",
      });
    }
  }, [nanogrids.length]);

  const captureCurrentData = useCallback((): LiveIntervalData[] => {
    return nanogrids.map((ng, index) => {
      const netPower = ng.solar_output - ng.load_demand;
      const avgBatterySoC = ng.battery_soc;
      const batteryCapacity = 50;
      const batteryCanAccept = Math.max(0, (100 - avgBatterySoC) / 100 * batteryCapacity * 0.5);
      const evMaxPower = 15;
      
      let gridExport = 0;
      let evSales = 0;
      
      if (netPower > 0) {
        const batteryCharge = Math.min(netPower, batteryCanAccept);
        const afterBattery = netPower - batteryCharge;
        evSales = Math.min(afterBattery, evMaxPower);
        gridExport = afterBattery - evSales;
      }

      return {
        nanogridId: ng.nanogrid_id,
        address: ng.address,
        solarOutput: ng.solar_output,
        loadDemand: ng.load_demand,
        batterySoC: ng.battery_soc,
        powerBalance: ng.power_balance,
        gridExport,
        evSales,
        timestamp: Date.now()
      };
    });
  }, [nanogrids]);

  const aggregateIntervalData = useCallback((samples: LiveIntervalData[][]): AggregatedIntervalData => {
    const now = Date.now();
    const intervalStart = now - INTERVAL_DURATION;
    
    const aggregatedNanogrids: LiveIntervalData[] = nanogrids.map((ng, index) => {
      const nanogridSamples = samples.flatMap(s => s.filter(d => d.nanogridId === ng.nanogrid_id));
      
      if (nanogridSamples.length === 0) {
        return captureCurrentData()[index];
      }

      return {
        nanogridId: ng.nanogrid_id,
        address: ng.address,
        solarOutput: nanogridSamples.reduce((sum, s) => sum + s.solarOutput, 0) / nanogridSamples.length,
        loadDemand: nanogridSamples.reduce((sum, s) => sum + s.loadDemand, 0) / nanogridSamples.length,
        batterySoC: nanogridSamples.reduce((sum, s) => sum + s.batterySoC, 0) / nanogridSamples.length,
        powerBalance: nanogridSamples.reduce((sum, s) => sum + s.powerBalance, 0) / nanogridSamples.length,
        gridExport: nanogridSamples.reduce((sum, s) => sum + s.gridExport, 0) / nanogridSamples.length,
        evSales: nanogridSamples.reduce((sum, s) => sum + s.evSales, 0) / nanogridSamples.length,
        timestamp: now
      };
    });

    return {
      timestamp: now,
      intervalStart,
      intervalEnd: now,
      totalGeneration: aggregatedNanogrids.reduce((sum, ng) => sum + ng.solarOutput, 0),
      totalConsumption: aggregatedNanogrids.reduce((sum, ng) => sum + ng.loadDemand, 0),
      avgBatterySoC: aggregatedNanogrids.reduce((sum, ng) => sum + ng.batterySoC, 0) / aggregatedNanogrids.length,
      totalGridExport: aggregatedNanogrids.reduce((sum, ng) => sum + ng.gridExport, 0),
      totalEvSales: aggregatedNanogrids.reduce((sum, ng) => sum + ng.evSales, 0),
      netPowerBalance: aggregatedNanogrids.reduce((sum, ng) => sum + ng.powerBalance, 0),
      nanogrids: aggregatedNanogrids
    };
  }, [nanogrids, captureCurrentData, INTERVAL_DURATION]);

  const recordToBlockchain = useCallback(async (data: AggregatedIntervalData) => {
    if (!isBlockchainConnected) return;

    const isPeakHour = new Date().getHours() >= 17 && new Date().getHours() < 21;

    for (const ng of data.nanogrids) {
      try {
        // Record interval data
        await recordIntervalData(
          ng.nanogridId,
          ng.solarOutput,
          ng.loadDemand,
          ng.batterySoC,
          ng.powerBalance,
          ng.gridExport,
          ng.evSales
        );

        // Record revenue
        if (ng.gridExport > 0 || ng.evSales > 0) {
          await recordRevenue(ng.nanogridId, ng.gridExport, ng.evSales, isPeakHour);
        }
      } catch (error) {
        console.error(`Failed to record data for nanogrid ${ng.nanogridId}:`, error);
      }
    }

    toast({
      title: "Interval Recorded",
      description: `15-min data recorded to blockchain for ${data.nanogrids.length} nanogrids`,
    });
  }, [isBlockchainConnected, recordIntervalData, recordRevenue]);

  const startRecording = useCallback(() => {
    if (isRecording) return;
    
    setIsRecording(true);
    dataAccumulator.current = [];
    setProgress(0);

    // Sample data every 5 seconds
    intervalRef.current = setInterval(() => {
      const sample = captureCurrentData();
      dataAccumulator.current.push(sample);
    }, SAMPLE_RATE);

    // Update progress every second
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (INTERVAL_DURATION / 1000));
        
        if (newProgress >= 100) {
          // Complete interval
          const aggregated = aggregateIntervalData(dataAccumulator.current);
          setCurrentInterval(aggregated);
          setIntervalHistory(prev => [...prev, aggregated]);
          
          // Record to blockchain
          recordToBlockchain(aggregated);
          
          // Reset for next interval
          dataAccumulator.current = [];
          return 0;
        }
        
        return newProgress;
      });
    }, 1000);
  }, [isRecording, captureCurrentData, aggregateIntervalData, recordToBlockchain, INTERVAL_DURATION, SAMPLE_RATE]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }

    // Save final partial interval if any data collected
    if (dataAccumulator.current.length > 0) {
      const aggregated = aggregateIntervalData(dataAccumulator.current);
      setCurrentInterval(aggregated);
      setIntervalHistory(prev => [...prev, aggregated]);
    }
    
    dataAccumulator.current = [];
    setProgress(0);
  }, [aggregateIntervalData]);

  const clearHistory = useCallback(() => {
    setIntervalHistory([]);
    setCurrentInterval(null);
  }, []);

  const exportToCSV = useCallback(() => {
    const allData = [...intervalHistory];
    if (allData.length === 0) {
      toast({
        title: "No Data",
        description: "No interval data to export",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'Interval Start', 'Interval End', 'Total Generation (kW)', 'Total Consumption (kW)',
      'Avg Battery SoC (%)', 'Grid Export (kW)', 'EV Sales (kW)', 'Net Balance (kW)',
      'Nanogrid ID', 'Address', 'Solar (kW)', 'Load (kW)', 'Battery (%)', 'Balance (kW)'
    ];

    const rows: string[][] = [];
    
    allData.forEach(interval => {
      interval.nanogrids.forEach((ng, index) => {
        rows.push([
          new Date(interval.intervalStart).toISOString(),
          new Date(interval.intervalEnd).toISOString(),
          index === 0 ? interval.totalGeneration.toFixed(2) : '',
          index === 0 ? interval.totalConsumption.toFixed(2) : '',
          index === 0 ? interval.avgBatterySoC.toFixed(1) : '',
          index === 0 ? interval.totalGridExport.toFixed(2) : '',
          index === 0 ? interval.totalEvSales.toFixed(2) : '',
          index === 0 ? interval.netPowerBalance.toFixed(2) : '',
          ng.nanogridId.toString(),
          ng.address,
          ng.solarOutput.toFixed(2),
          ng.loadDemand.toFixed(2),
          ng.batterySoC.toFixed(1),
          ng.powerBalance.toFixed(2)
        ]);
      });
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nanogrid_intervals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${allData.length} intervals to CSV`
    });
  }, [intervalHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  return {
    isRecording,
    isBlockchainConnected,
    progress,
    currentInterval,
    intervalHistory,
    blockchainRecords,
    startRecording,
    stopRecording,
    clearHistory,
    exportToCSV
  };
};
