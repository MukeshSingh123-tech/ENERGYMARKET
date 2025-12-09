import { useState, useEffect, useCallback } from 'react';

export interface IntervalRecord {
  timestamp: string;
  intervalStart: string;
  intervalEnd: string;
  nanogrids: {
    nanogrid_id: number;
    avgSolarOutput: number;
    avgLoadDemand: number;
    avgBatterySoC: number;
    avgPowerBalance: number;
    totalEnergyGenerated: number;
    totalEnergyConsumed: number;
    batteryStoredEnergy: number;
    exportedToGrid: number;
    soldToEV: number;
  }[];
  systemTotals: {
    totalGeneration: number;
    totalDemand: number;
    frequencyMatch: boolean;
    batteryCharge: number;
    gridExport: number;
    evSales: number;
  };
}

interface NanogridData {
  nanogrid_id: number;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
  power_balance: number;
}

interface NanogridAccumulator {
  samples: number;
  totalSolar: number;
  totalLoad: number;
  totalBattery: number;
  totalBalance: number;
  maxSolar: number;
  maxLoad: number;
}

export function useEnergyIntervalData(nanogrids: NanogridData[], intervalMinutes: number = 15) {
  const [intervalData, setIntervalData] = useState<IntervalRecord[]>([]);
  const [currentIntervalStart, setCurrentIntervalStart] = useState<Date | null>(null);
  const [accumulators, setAccumulators] = useState<Map<number, NanogridAccumulator>>(new Map());
  const [isRecording, setIsRecording] = useState(false);

  // Start a new interval
  const startNewInterval = useCallback(() => {
    const now = new Date();
    setCurrentIntervalStart(now);
    
    const newAccumulators = new Map<number, NanogridAccumulator>();
    nanogrids.forEach(ng => {
      newAccumulators.set(ng.nanogrid_id, {
        samples: 0,
        totalSolar: 0,
        totalLoad: 0,
        totalBattery: 0,
        totalBalance: 0,
        maxSolar: 0,
        maxLoad: 0,
      });
    });
    setAccumulators(newAccumulators);
  }, [nanogrids]);

  // Accumulate data samples
  useEffect(() => {
    if (!isRecording || !currentIntervalStart) return;

    const sampleInterval = setInterval(() => {
      setAccumulators(prev => {
        const updated = new Map(prev);
        nanogrids.forEach(ng => {
          const existing = updated.get(ng.nanogrid_id) || {
            samples: 0, totalSolar: 0, totalLoad: 0, totalBattery: 0, totalBalance: 0, maxSolar: 0, maxLoad: 0
          };
          updated.set(ng.nanogrid_id, {
            samples: existing.samples + 1,
            totalSolar: existing.totalSolar + ng.solar_output,
            totalLoad: existing.totalLoad + ng.load_demand,
            totalBattery: existing.totalBattery + ng.battery_soc,
            totalBalance: existing.totalBalance + ng.power_balance,
            maxSolar: Math.max(existing.maxSolar, ng.solar_output),
            maxLoad: Math.max(existing.maxLoad, ng.load_demand),
          });
        });
        return updated;
      });
    }, 5000); // Sample every 5 seconds

    return () => clearInterval(sampleInterval);
  }, [isRecording, currentIntervalStart, nanogrids]);

  // Check if interval is complete
  useEffect(() => {
    if (!isRecording || !currentIntervalStart) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const elapsedMs = now.getTime() - currentIntervalStart.getTime();
      const intervalMs = intervalMinutes * 60 * 1000;

      if (elapsedMs >= intervalMs) {
        // Finalize interval record
        const intervalEnd = new Date(currentIntervalStart.getTime() + intervalMs);
        
        const nanogridRecords = nanogrids.map(ng => {
          const acc = accumulators.get(ng.nanogrid_id);
          if (!acc || acc.samples === 0) {
            return {
              nanogrid_id: ng.nanogrid_id,
              avgSolarOutput: ng.solar_output,
              avgLoadDemand: ng.load_demand,
              avgBatterySoC: ng.battery_soc,
              avgPowerBalance: ng.power_balance,
              totalEnergyGenerated: ng.solar_output * intervalMinutes / 60,
              totalEnergyConsumed: ng.load_demand * intervalMinutes / 60,
              batteryStoredEnergy: Math.max(0, ng.power_balance) * 0.3 * intervalMinutes / 60,
              exportedToGrid: Math.max(0, ng.power_balance) * 0.4 * intervalMinutes / 60,
              soldToEV: Math.max(0, ng.power_balance) * 0.3 * intervalMinutes / 60,
            };
          }
          
          const avgSolar = acc.totalSolar / acc.samples;
          const avgLoad = acc.totalLoad / acc.samples;
          const avgBalance = acc.totalBalance / acc.samples;
          const surplus = Math.max(0, avgBalance);
          
          return {
            nanogrid_id: ng.nanogrid_id,
            avgSolarOutput: parseFloat(avgSolar.toFixed(2)),
            avgLoadDemand: parseFloat(avgLoad.toFixed(2)),
            avgBatterySoC: parseFloat((acc.totalBattery / acc.samples).toFixed(2)),
            avgPowerBalance: parseFloat(avgBalance.toFixed(2)),
            totalEnergyGenerated: parseFloat((avgSolar * intervalMinutes / 60).toFixed(3)),
            totalEnergyConsumed: parseFloat((avgLoad * intervalMinutes / 60).toFixed(3)),
            batteryStoredEnergy: parseFloat((surplus * 0.3 * intervalMinutes / 60).toFixed(3)),
            exportedToGrid: parseFloat((surplus * 0.4 * intervalMinutes / 60).toFixed(3)),
            soldToEV: parseFloat((surplus * 0.3 * intervalMinutes / 60).toFixed(3)),
          };
        });

        const totalGen = nanogridRecords.reduce((sum, r) => sum + r.avgSolarOutput, 0);
        const totalDemand = nanogridRecords.reduce((sum, r) => sum + r.avgLoadDemand, 0);
        const frequencyMatch = Math.abs(totalGen - totalDemand) < totalGen * 0.1; // Within 10%

        const record: IntervalRecord = {
          timestamp: now.toISOString(),
          intervalStart: currentIntervalStart.toISOString(),
          intervalEnd: intervalEnd.toISOString(),
          nanogrids: nanogridRecords,
          systemTotals: {
            totalGeneration: parseFloat(totalGen.toFixed(2)),
            totalDemand: parseFloat(totalDemand.toFixed(2)),
            frequencyMatch,
            batteryCharge: nanogridRecords.reduce((sum, r) => sum + r.batteryStoredEnergy, 0),
            gridExport: nanogridRecords.reduce((sum, r) => sum + r.exportedToGrid, 0),
            evSales: nanogridRecords.reduce((sum, r) => sum + r.soldToEV, 0),
          },
        };

        setIntervalData(prev => [...prev, record]);
        startNewInterval();
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isRecording, currentIntervalStart, intervalMinutes, nanogrids, accumulators, startNewInterval]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    startNewInterval();
  }, [startNewInterval]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setCurrentIntervalStart(null);
  }, []);

  const clearData = useCallback(() => {
    setIntervalData([]);
  }, []);

  const exportToCSV = useCallback(() => {
    if (intervalData.length === 0) return;

    const headers = [
      'Interval Start', 'Interval End',
      'Nanogrid ID', 'Avg Solar (kW)', 'Avg Load (kW)', 'Avg Battery SoC (%)',
      'Avg Power Balance (kW)', 'Energy Generated (kWh)', 'Energy Consumed (kWh)',
      'Battery Stored (kWh)', 'Grid Export (kWh)', 'EV Sales (kWh)',
      'System Total Gen (kW)', 'System Total Demand (kW)', 'Frequency Match',
      'System Battery (kWh)', 'System Grid Export (kWh)', 'System EV Sales (kWh)'
    ];

    const rows: string[][] = [];
    intervalData.forEach(record => {
      record.nanogrids.forEach(ng => {
        rows.push([
          record.intervalStart,
          record.intervalEnd,
          ng.nanogrid_id.toString(),
          ng.avgSolarOutput.toString(),
          ng.avgLoadDemand.toString(),
          ng.avgBatterySoC.toString(),
          ng.avgPowerBalance.toString(),
          ng.totalEnergyGenerated.toString(),
          ng.totalEnergyConsumed.toString(),
          ng.batteryStoredEnergy.toString(),
          ng.exportedToGrid.toString(),
          ng.soldToEV.toString(),
          record.systemTotals.totalGeneration.toString(),
          record.systemTotals.totalDemand.toString(),
          record.systemTotals.frequencyMatch ? 'Yes' : 'No',
          record.systemTotals.batteryCharge.toFixed(3),
          record.systemTotals.gridExport.toFixed(3),
          record.systemTotals.evSales.toFixed(3),
        ]);
      });
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `energy_intervals_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [intervalData]);

  const getElapsedTime = useCallback(() => {
    if (!currentIntervalStart) return 0;
    return (Date.now() - currentIntervalStart.getTime()) / 1000;
  }, [currentIntervalStart]);

  return {
    intervalData,
    isRecording,
    startRecording,
    stopRecording,
    clearData,
    exportToCSV,
    getElapsedTime,
    currentIntervalStart,
    intervalMinutes,
  };
}
