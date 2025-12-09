import { useState, useEffect, useCallback } from 'react';

export interface RevenueRecord {
  timestamp: string;
  gridExportKwh: number;
  evSalesKwh: number;
  gridRevenue: number;
  evRevenue: number;
  totalRevenue: number;
}

export interface DailySummary {
  date: string;
  gridExportKwh: number;
  evSalesKwh: number;
  gridRevenue: number;
  evRevenue: number;
  totalRevenue: number;
  peakHour: string;
  avgPricePerKwh: number;
}

export interface PricingConfig {
  gridPricePerKwh: number;
  evPricePerKwh: number;
  peakMultiplier: number;
  peakHoursStart: number;
  peakHoursEnd: number;
}

const DEFAULT_PRICING: PricingConfig = {
  gridPricePerKwh: 0.12, // $0.12 per kWh for grid
  evPricePerKwh: 0.18,   // $0.18 per kWh for EV (premium)
  peakMultiplier: 1.5,   // 50% more during peak hours
  peakHoursStart: 17,    // 5 PM
  peakHoursEnd: 21,      // 9 PM
};

export function useRevenueTracking(
  gridExportPower: number,
  evChargePower: number,
  pricing: PricingConfig = DEFAULT_PRICING
) {
  const [revenueHistory, setRevenueHistory] = useState<RevenueRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPricing, setCurrentPricing] = useState<PricingConfig>(pricing);

  // Check if current hour is peak
  const isPeakHour = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= currentPricing.peakHoursStart && hour < currentPricing.peakHoursEnd;
  }, [currentPricing]);

  // Calculate current prices with peak adjustment
  const getCurrentPrices = useCallback(() => {
    const multiplier = isPeakHour() ? currentPricing.peakMultiplier : 1;
    return {
      gridPrice: currentPricing.gridPricePerKwh * multiplier,
      evPrice: currentPricing.evPricePerKwh * multiplier,
      isPeak: isPeakHour(),
    };
  }, [currentPricing, isPeakHour]);

  // Track revenue every minute
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      const prices = getCurrentPrices();
      const intervalHours = 1 / 60; // 1 minute in hours
      
      const gridKwh = gridExportPower * intervalHours;
      const evKwh = evChargePower * intervalHours;
      const gridRev = gridKwh * prices.gridPrice;
      const evRev = evKwh * prices.evPrice;

      const record: RevenueRecord = {
        timestamp: new Date().toISOString(),
        gridExportKwh: parseFloat(gridKwh.toFixed(4)),
        evSalesKwh: parseFloat(evKwh.toFixed(4)),
        gridRevenue: parseFloat(gridRev.toFixed(4)),
        evRevenue: parseFloat(evRev.toFixed(4)),
        totalRevenue: parseFloat((gridRev + evRev).toFixed(4)),
      };

      setRevenueHistory(prev => [...prev.slice(-1440), record]); // Keep last 24 hours (1440 minutes)
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isTracking, gridExportPower, evChargePower, getCurrentPrices]);

  // Update daily summaries
  useEffect(() => {
    if (revenueHistory.length === 0) return;

    const summaryMap = new Map<string, {
      gridKwh: number;
      evKwh: number;
      gridRev: number;
      evRev: number;
      records: RevenueRecord[];
    }>();

    revenueHistory.forEach(record => {
      const date = record.timestamp.split('T')[0];
      const existing = summaryMap.get(date) || { gridKwh: 0, evKwh: 0, gridRev: 0, evRev: 0, records: [] };
      summaryMap.set(date, {
        gridKwh: existing.gridKwh + record.gridExportKwh,
        evKwh: existing.evKwh + record.evSalesKwh,
        gridRev: existing.gridRev + record.gridRevenue,
        evRev: existing.evRev + record.evRevenue,
        records: [...existing.records, record],
      });
    });

    const summaries: DailySummary[] = Array.from(summaryMap.entries()).map(([date, data]) => {
      const totalKwh = data.gridKwh + data.evKwh;
      const totalRev = data.gridRev + data.evRev;
      
      // Find peak revenue hour
      const hourlyRevenue = new Map<number, number>();
      data.records.forEach(r => {
        const hour = new Date(r.timestamp).getHours();
        hourlyRevenue.set(hour, (hourlyRevenue.get(hour) || 0) + r.totalRevenue);
      });
      
      let peakHour = 0;
      let maxRevenue = 0;
      hourlyRevenue.forEach((rev, hour) => {
        if (rev > maxRevenue) {
          maxRevenue = rev;
          peakHour = hour;
        }
      });

      return {
        date,
        gridExportKwh: parseFloat(data.gridKwh.toFixed(3)),
        evSalesKwh: parseFloat(data.evKwh.toFixed(3)),
        gridRevenue: parseFloat(data.gridRev.toFixed(2)),
        evRevenue: parseFloat(data.evRev.toFixed(2)),
        totalRevenue: parseFloat(totalRev.toFixed(2)),
        peakHour: `${peakHour}:00`,
        avgPricePerKwh: totalKwh > 0 ? parseFloat((totalRev / totalKwh).toFixed(3)) : 0,
      };
    });

    setDailySummaries(summaries);
  }, [revenueHistory]);

  // Get current session totals
  const getSessionTotals = useCallback(() => {
    return revenueHistory.reduce((acc, record) => ({
      gridExportKwh: acc.gridExportKwh + record.gridExportKwh,
      evSalesKwh: acc.evSalesKwh + record.evSalesKwh,
      gridRevenue: acc.gridRevenue + record.gridRevenue,
      evRevenue: acc.evRevenue + record.evRevenue,
      totalRevenue: acc.totalRevenue + record.totalRevenue,
    }), {
      gridExportKwh: 0,
      evSalesKwh: 0,
      gridRevenue: 0,
      evRevenue: 0,
      totalRevenue: 0,
    });
  }, [revenueHistory]);

  // Estimate monthly revenue based on current rate
  const getMonthlyProjection = useCallback(() => {
    if (revenueHistory.length < 10) return null;
    
    const recentRecords = revenueHistory.slice(-60); // Last hour
    const hourlyRevenue = recentRecords.reduce((sum, r) => sum + r.totalRevenue, 0);
    const hourlyKwh = recentRecords.reduce((sum, r) => sum + r.gridExportKwh + r.evSalesKwh, 0);
    
    return {
      dailyRevenue: parseFloat((hourlyRevenue * 24).toFixed(2)),
      monthlyRevenue: parseFloat((hourlyRevenue * 24 * 30).toFixed(2)),
      dailyKwh: parseFloat((hourlyKwh * 24).toFixed(2)),
      monthlyKwh: parseFloat((hourlyKwh * 24 * 30).toFixed(2)),
    };
  }, [revenueHistory]);

  const startTracking = useCallback(() => setIsTracking(true), []);
  const stopTracking = useCallback(() => setIsTracking(false), []);
  const clearHistory = useCallback(() => {
    setRevenueHistory([]);
    setDailySummaries([]);
  }, []);

  const updatePricing = useCallback((newPricing: Partial<PricingConfig>) => {
    setCurrentPricing(prev => ({ ...prev, ...newPricing }));
  }, []);

  const exportToCSV = useCallback(() => {
    if (revenueHistory.length === 0) return;

    const headers = ['Timestamp', 'Grid Export (kWh)', 'EV Sales (kWh)', 'Grid Revenue ($)', 'EV Revenue ($)', 'Total Revenue ($)'];
    const rows = revenueHistory.map(r => [
      r.timestamp,
      r.gridExportKwh.toString(),
      r.evSalesKwh.toString(),
      r.gridRevenue.toFixed(4),
      r.evRevenue.toFixed(4),
      r.totalRevenue.toFixed(4),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [revenueHistory]);

  return {
    revenueHistory,
    dailySummaries,
    isTracking,
    currentPricing,
    getCurrentPrices,
    getSessionTotals,
    getMonthlyProjection,
    startTracking,
    stopTracking,
    clearHistory,
    updatePricing,
    exportToCSV,
  };
}
