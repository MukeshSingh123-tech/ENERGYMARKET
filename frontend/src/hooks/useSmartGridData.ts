import { useState, useEffect } from 'react';
import { useBackendConfig } from '@/contexts/BackendConfigContext';

interface NanogridData {
  nanogrid_id: number;
  solar_output: number;
  load_demand: number;
  battery_soc: number;
  power_balance: number;
  address: string;
}

interface Transaction {
  sender: string;
  receiver: string;
  amountInKwh: number;
  timestamp: number;
}

interface SystemStatus {
  mode: "simulation" | "live";
  nanogridsOnline: number;
  totalNanogrids: number;
  blockchainConnected: boolean;
  aiControllerActive: boolean;
}

interface SmartGridData {
  nanogrids: NanogridData[];
  transactions: Transaction[];
  systemStatus: SystemStatus;
  loading: boolean;
  error: string | null;
}

export function useSmartGridData(): SmartGridData {
  const { config, setIsConnected } = useBackendConfig();
  const [data, setData] = useState<SmartGridData>({
    nanogrids: [],
    transactions: [],
    systemStatus: {
      mode: "simulation",
      nanogridsOnline: 0,
      totalNanogrids: 5,
      blockchainConnected: true,
      aiControllerActive: true,
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gridResponse, transactionsResponse, systemResponse] = await Promise.all([
          fetch(`${config.apiUrl}/api/grid-status`),
          fetch(`${config.apiUrl}/api/blockchain/transactions`),
          fetch(`${config.apiUrl}/api/system-status`)
        ]);

        const gridData = await gridResponse.json();
        const transactionsData = await transactionsResponse.json();
        const systemData = await systemResponse.json();

        // Map nanogrids to add power_balance if not present
        const nanogridsWithBalance = (gridData.nanogrids || []).map((ng: any) => ({
          ...ng,
          power_balance: ng.power_balance !== undefined ? ng.power_balance : (ng.solar_output - ng.load_demand)
        }));

        setData({
          nanogrids: nanogridsWithBalance,
          transactions: transactionsData.transactions || [],
          systemStatus: {
            mode: systemData.mode || "simulation",
            nanogridsOnline: systemData.nanogrids_online || 0,
            totalNanogrids: systemData.total_nanogrids || 5,
            blockchainConnected: systemData.blockchain_connected || false,
            aiControllerActive: systemData.ai_controller_active || false,
          },
          loading: false,
          error: null,
        });
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
        console.error('Error fetching grid data:', error);
        
        // Generate random fallback data with total generation > total demand
        const generateRandomInRange = (min: number, max: number) => 
          Math.random() * (max - min) + min;
        
        const nanogrids = [
          { 
            nanogrid_id: 1, 
            solar_output: generateRandomInRange(12, 18), 
            load_demand: generateRandomInRange(6, 10), 
            battery_soc: Math.floor(generateRandomInRange(60, 90)), 
            power_balance: 0,
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' 
          },
          { 
            nanogrid_id: 2, 
            solar_output: generateRandomInRange(14, 20), 
            load_demand: generateRandomInRange(8, 12), 
            battery_soc: Math.floor(generateRandomInRange(55, 85)), 
            power_balance: 0,
            address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' 
          },
          { 
            nanogrid_id: 3, 
            solar_output: generateRandomInRange(10, 15), 
            load_demand: generateRandomInRange(7, 11), 
            battery_soc: Math.floor(generateRandomInRange(40, 70)), 
            power_balance: 0,
            address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0' 
          },
          { 
            nanogrid_id: 4, 
            solar_output: generateRandomInRange(16, 22), 
            load_demand: generateRandomInRange(9, 13), 
            battery_soc: Math.floor(generateRandomInRange(70, 95)), 
            power_balance: 0,
            address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E' 
          },
          { 
            nanogrid_id: 5, 
            solar_output: generateRandomInRange(11, 17), 
            load_demand: generateRandomInRange(8, 12), 
            battery_soc: Math.floor(generateRandomInRange(50, 80)), 
            power_balance: 0,
            address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30' 
          },
        ].map(ng => ({
          ...ng,
          solar_output: parseFloat(ng.solar_output.toFixed(1)),
          load_demand: parseFloat(ng.load_demand.toFixed(1)),
          power_balance: parseFloat((ng.solar_output - ng.load_demand).toFixed(1))
        }));
        
        setData({
          nanogrids,
          transactions: [
            { 
              sender: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 
              receiver: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', 
              amountInKwh: generateRandomInRange(2, 5), 
              timestamp: Date.now() - Math.floor(generateRandomInRange(60000, 180000))
            },
            { 
              sender: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', 
              receiver: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', 
              amountInKwh: generateRandomInRange(1.5, 4), 
              timestamp: Date.now() - Math.floor(generateRandomInRange(180000, 360000))
            },
          ],
          systemStatus: {
            mode: "simulation",
            nanogridsOnline: 5,
            totalNanogrids: 5,
            blockchainConnected: true,
            aiControllerActive: true,
          },
          loading: false,
          error: null,
        });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [config.apiUrl]);

  return data;
}
