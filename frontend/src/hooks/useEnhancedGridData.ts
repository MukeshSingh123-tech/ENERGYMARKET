import { useState, useEffect } from 'react';

export interface PerformanceMetrics {
  efficiency: number;
  utilization: number;
  healthScore: number;
  temperatureC: number;
  voltage: number;
  current: number;
  transmissionLoss: number;
}

export interface ForecastData {
  hour: string;
  solarPrediction: number;
  loadPrediction: number;
  batteryPrediction: number;
  priceForcast: number;
  confidence: number;
  weatherCondition: string;
}

export interface MarketOrder {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  address: string;
  timestamp: number;
  status: 'active' | 'filled' | 'cancelled';
}

export interface MarketDepth {
  buyOrders: MarketOrder[];
  sellOrders: MarketOrder[];
  spread: number;
  volume24h: number;
  priceChange24h: number;
}

export interface EnhancedNanogridData {
  nanogrid_id: number;
  address: string;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
  power_balance: number;
  performance: PerformanceMetrics;
  forecast: ForecastData[];
  maintenanceScheduled: Date | null;
  isOptimized: boolean;
}

export interface TradingAnalytics {
  totalVolume: number;
  averagePrice: number;
  priceVolatility: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  liquidityScore: number;
}

export interface EnhancedGridData {
  nanogrids: EnhancedNanogridData[];
  marketDepth: MarketDepth;
  tradingAnalytics: TradingAnalytics;
  priceHistory: Array<{ timestamp: number; price: number; volume: number }>;
  loading: boolean;
  error: string | null;
}

export function useEnhancedGridData(): EnhancedGridData {
  const [data, setData] = useState<EnhancedGridData>({
    nanogrids: [],
    marketDepth: {
      buyOrders: [],
      sellOrders: [],
      spread: 0,
      volume24h: 0,
      priceChange24h: 0
    },
    tradingAnalytics: {
      totalVolume: 0,
      averagePrice: 0.12,
      priceVolatility: 0,
      marketSentiment: 'neutral',
      liquidityScore: 0
    },
    priceHistory: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const mockNanogrids: EnhancedNanogridData[] = [
      {
        nanogrid_id: 1,
        address: "0x1234567890abcdef1234567890abcdef12345678",
        solar_output: 15.2,
        load_demand: 12.8,
        battery_soc: 85,
        power_balance: 2.4,
        performance: {
          efficiency: 92.5,
          utilization: 68.2,
          healthScore: 98.1,
          temperatureC: 28.3,
          voltage: 245.2,
          current: 62.5,
          transmissionLoss: 1.2
        },
        forecast: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          solarPrediction: Math.max(0, 15.2 * (0.8 + 0.4 * Math.sin(hour / 4))),
          loadPrediction: 12.8 * (0.9 + 0.2 * Math.random()),
          batteryPrediction: 85 + Math.sin(hour / 3) * 5,
          priceForcast: 0.10 + Math.sin(hour / 6) * 0.02 + Math.random() * 0.01,
          confidence: 85 + Math.random() * 10,
          weatherCondition: hour > 6 && hour < 18 ? 'Clear' : 'Cloudy'
        })),
        maintenanceScheduled: null,
        isOptimized: true
      },
      {
        nanogrid_id: 2,
        address: "0xabcdef1234567890abcdef1234567890abcdef12",
        solar_output: 8.7,
        load_demand: 14.3,
        battery_soc: 62,
        power_balance: -5.6,
        performance: {
          efficiency: 88.3,
          utilization: 45.1,
          healthScore: 86.5,
          temperatureC: 31.2,
          voltage: 238.7,
          current: 58.9,
          transmissionLoss: 2.1
        },
        forecast: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          solarPrediction: Math.max(0, 8.7 * (0.8 + 0.4 * Math.sin(hour / 4))),
          loadPrediction: 14.3 * (0.9 + 0.2 * Math.random()),
          batteryPrediction: 62 + Math.sin(hour / 3) * 5,
          priceForcast: 0.10 + Math.sin(hour / 6) * 0.02 + Math.random() * 0.01,
          confidence: 85 + Math.random() * 10,
          weatherCondition: hour > 6 && hour < 18 ? 'Partly Cloudy' : 'Clear'
        })),
        maintenanceScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isOptimized: false
      },
      {
        nanogrid_id: 3,
        address: "0x567890abcdef1234567890abcdef1234567890ab",
        solar_output: 22.5,
        load_demand: 18.2,
        battery_soc: 92,
        power_balance: 4.3,
        performance: {
          efficiency: 94.8,
          utilization: 82.3,
          healthScore: 99.2,
          temperatureC: 26.5,
          voltage: 248.1,
          current: 91.3,
          transmissionLoss: 0.8
        },
        forecast: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          solarPrediction: Math.max(0, 22.5 * (0.8 + 0.4 * Math.sin(hour / 4))),
          loadPrediction: 18.2 * (0.9 + 0.2 * Math.random()),
          batteryPrediction: 92 + Math.sin(hour / 3) * 5,
          priceForcast: 0.10 + Math.sin(hour / 6) * 0.02 + Math.random() * 0.01,
          confidence: 85 + Math.random() * 10,
          weatherCondition: hour > 6 && hour < 18 ? 'Clear' : 'Clear'
        })),
        maintenanceScheduled: null,
        isOptimized: true
      },
      {
        nanogrid_id: 4,
        address: "0xcdef1234567890abcdef1234567890abcdef1234",
        solar_output: 11.8,
        load_demand: 9.5,
        battery_soc: 78,
        power_balance: 2.3,
        performance: {
          efficiency: 90.2,
          utilization: 61.4,
          healthScore: 94.3,
          temperatureC: 29.8,
          voltage: 242.5,
          current: 48.7,
          transmissionLoss: 1.5
        },
        forecast: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          solarPrediction: Math.max(0, 11.8 * (0.8 + 0.4 * Math.sin(hour / 4))),
          loadPrediction: 9.5 * (0.9 + 0.2 * Math.random()),
          batteryPrediction: 78 + Math.sin(hour / 3) * 5,
          priceForcast: 0.10 + Math.sin(hour / 6) * 0.02 + Math.random() * 0.01,
          confidence: 85 + Math.random() * 10,
          weatherCondition: hour > 6 && hour < 18 ? 'Clear' : 'Partly Cloudy'
        })),
        maintenanceScheduled: null,
        isOptimized: true
      },
      {
        nanogrid_id: 5,
        address: "0x90abcdef1234567890abcdef1234567890abcdef",
        solar_output: 19.3,
        load_demand: 21.7,
        battery_soc: 45,
        power_balance: -2.4,
        performance: {
          efficiency: 84.7,
          utilization: 72.8,
          healthScore: 81.2,
          temperatureC: 33.1,
          voltage: 236.9,
          current: 81.5,
          transmissionLoss: 2.8
        },
        forecast: Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour}:00`,
          solarPrediction: Math.max(0, 19.3 * (0.8 + 0.4 * Math.sin(hour / 4))),
          loadPrediction: 21.7 * (0.9 + 0.2 * Math.random()),
          batteryPrediction: 45 + Math.sin(hour / 3) * 5,
          priceForcast: 0.10 + Math.sin(hour / 6) * 0.02 + Math.random() * 0.01,
          confidence: 85 + Math.random() * 10,
          weatherCondition: hour > 6 && hour < 18 ? 'Partly Cloudy' : 'Cloudy'
        })),
        maintenanceScheduled: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        isOptimized: false
      }
    ];

    const mockBuyOrders: MarketOrder[] = [
      { id: '1', type: 'buy', amount: 50, price: 0.119, address: '0x1234...5678', timestamp: Date.now() - 300000, status: 'active' },
      { id: '2', type: 'buy', amount: 30, price: 0.118, address: '0xabcd...ef12', timestamp: Date.now() - 600000, status: 'active' },
      { id: '3', type: 'buy', amount: 75, price: 0.117, address: '0x5678...90ab', timestamp: Date.now() - 900000, status: 'active' },
      { id: '4', type: 'buy', amount: 100, price: 0.116, address: '0xcdef...1234', timestamp: Date.now() - 1200000, status: 'active' },
    ];

    const mockSellOrders: MarketOrder[] = [
      { id: '5', type: 'sell', amount: 45, price: 0.121, address: '0x90ab...cdef', timestamp: Date.now() - 250000, status: 'active' },
      { id: '6', type: 'sell', amount: 60, price: 0.122, address: '0x1234...abcd', timestamp: Date.now() - 550000, status: 'active' },
      { id: '7', type: 'sell', amount: 80, price: 0.123, address: '0xef12...3456', timestamp: Date.now() - 850000, status: 'active' },
      { id: '8', type: 'sell', amount: 55, price: 0.124, address: '0x7890...def1', timestamp: Date.now() - 1150000, status: 'active' },
    ];

    const mockPriceHistory = Array.from({ length: 24 }, (_, i) => ({
      timestamp: Date.now() - (24 - i) * 3600000,
      price: 0.11 + Math.sin(i / 4) * 0.02 + Math.random() * 0.01,
      volume: 50 + Math.random() * 100
    }));

    setData({
      nanogrids: mockNanogrids,
      marketDepth: {
        buyOrders: mockBuyOrders,
        sellOrders: mockSellOrders,
        spread: 0.002,
        volume24h: 2580,
        priceChange24h: 3.2
      },
      tradingAnalytics: {
        totalVolume: 2580,
        averagePrice: 0.12,
        priceVolatility: 4.5,
        marketSentiment: 'bullish',
        liquidityScore: 85
      },
      priceHistory: mockPriceHistory,
      loading: false,
      error: null,
    });
  }, []);

  return data;
}
