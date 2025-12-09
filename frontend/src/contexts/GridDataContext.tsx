import React, { createContext, useContext, ReactNode } from 'react';
import { useSmartGridData } from '@/hooks/useSmartGridData';

type NanogridData = {
  nanogrid_id: number;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
  power_balance: number;
  address: string;
};

type Transaction = {
  sender: string;
  receiver: string;
  amountInKwh: number;
  timestamp: number;
};

type SystemStatus = {
  mode: 'simulation' | 'live';
  nanogridsOnline: number;
  totalNanogrids: number;
  blockchainConnected: boolean;
  aiControllerActive: boolean;
};

type GridContextValue = {
  nanogrids: NanogridData[];
  transactions: Transaction[];
  systemStatus: SystemStatus;
  loading: boolean;
  error: string | null;
};

const GridDataContext = createContext<GridContextValue | undefined>(undefined);

export const GridDataProvider = ({ children }: { children: ReactNode }) => {
  const { nanogrids, transactions, systemStatus, loading, error } = useSmartGridData();

  return (
    <GridDataContext.Provider value={{ nanogrids, transactions, systemStatus, loading, error }}>
      {children}
    </GridDataContext.Provider>
  );
};

export const useGridData = () => {
  const ctx = useContext(GridDataContext);
  if (!ctx) throw new Error('useGridData must be used within GridDataProvider');
  return ctx;
};
