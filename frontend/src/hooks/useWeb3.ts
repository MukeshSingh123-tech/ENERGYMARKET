import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CUSTOM_NETWORK, CONTRACT_ADDRESS, NANOGRID_ADDRESSES, ALL_NANOGRID_ADDRESSES } from '@/blockchain/config';
import CONTRACT_ABI from '@/blockchain/abi/EnergyMarket.json';
import type { WalletState, BlockchainTransaction } from '../../types/grid';

export interface BlockchainNanogrid {
  owner: string;
  nanogridId: number;
  totalGeneration: number;
  totalConsumption: number;
  batteryCapacity: number;
  batterySoC: number;
  gridExportRevenue: number;
  evSalesRevenue: number;
  lastUpdated: number;
  isActive: boolean;
}

export interface BlockchainIntervalRecord {
  nanogridId: number;
  solarOutput: number;
  loadDemand: number;
  batterySoC: number;
  powerBalance: number;
  gridExport: number;
  evSales: number;
  timestamp: number;
}

export interface BlockchainRevenue {
  gridRevenue: number;
  evRevenue: number;
  p2pRevenue: number;
  totalRevenue: number;
}

export const useWeb3 = () => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isBlockchainConnected, setIsBlockchainConnected] = useState(false);
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isProsumer: false,
    isLoading: false,
    error: null
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

  // Initialize provider and contract
  const initializeEthers = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);

        const userSigner = await browserProvider.getSigner();
        setSigner(userSigner);

        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, userSigner);
        setContract(contractInstance);
        
        // Test connection
        await browserProvider.getBlockNumber();
        setIsBlockchainConnected(true);

        return { provider: browserProvider, signer: userSigner, contract: contractInstance };
      } catch (error) {
        console.error('Failed to initialize ethers:', error);
        setIsBlockchainConnected(false);
        throw error;
      }
    } else {
      throw new Error('MetaMask not detected. Please install MetaMask!');
    }
  }, []);

  // Add or switch to custom network
  const addCustomNetwork = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.toQuantity(CUSTOM_NETWORK.chainId) }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ethers.toQuantity(CUSTOM_NETWORK.chainId),
              chainName: CUSTOM_NETWORK.name,
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: [CUSTOM_NETWORK.rpcUrl],
              blockExplorerUrls: null
            }]
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  // Connect to MetaMask and custom network
  const connectWallet = useCallback(async () => {
    setWalletState(prev => ({ ...prev, isLoading: true }));
    
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask!');
      }

      await addCustomNetwork();

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please check your MetaMask.');
      }

      const { contract: contractInstance } = await initializeEthers();
      const userAddress = accounts[0];

      let isProsumerRegistered = false;
      if (contractInstance) {
        try {
          isProsumerRegistered = await contractInstance.isProsumer(userAddress);
        } catch (error) {
          console.warn('Could not check prosumer status:', error);
        }
      }

      setWalletState({
        isConnected: true,
        address: userAddress,
        isProsumer: isProsumerRegistered,
        isLoading: false,
        error: null
      });

      return userAddress;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setWalletState(prev => ({ 
        ...prev, 
        isLoading: false,
        isConnected: false,
        address: null,
        error: error.message || 'Failed to connect wallet'
      }));
      throw error;
    }
  }, [addCustomNetwork, initializeEthers]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      isProsumer: false,
      isLoading: false,
      error: null
    });
    setProvider(null);
    setSigner(null);
    setContract(null);
    setIsBlockchainConnected(false);
  }, []);

  // Register as prosumer
  const registerProsumer = useCallback(async () => {
    if (!contract || !walletState.address) {
      throw new Error('Wallet not connected');
    }

    try {
      setWalletState(prev => ({ ...prev, isLoading: true }));
      
      try {
        await provider?.getBlockNumber();
      } catch (networkError) {
        throw new Error('Cannot connect to blockchain network. Please ensure your local blockchain (Ganache/Truffle) is running on http://127.0.0.1:8545');
      }
      
      const tx = await contract.registerProsumer();
      await tx.wait();
      
      setWalletState(prev => ({ 
        ...prev, 
        isProsumer: true, 
        isLoading: false,
        error: null
      }));
      
      return tx.hash;
    } catch (error: any) {
      console.error('Failed to register prosumer:', error);
      
      let errorMessage = 'Failed to register as prosumer';
      
      if (error.message?.includes('circuit breaker') || error.message?.includes('blockchain network')) {
        errorMessage = 'Blockchain not running. Start Ganache on port 8545 and try again.';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction was rejected in MetaMask';
      } else if (error.message?.includes('Already registered')) {
        errorMessage = 'You are already registered as a prosumer';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setWalletState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      
      throw new Error(errorMessage);
    }
  }, [contract, walletState.address, provider]);

  // Register a nanogrid (owner only)
  const registerNanogrid = useCallback(async (nanogridAddress: string, batteryCapacity: number) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      const capacityWei = ethers.parseEther(batteryCapacity.toString());
      const tx = await contract.registerNanogrid(nanogridAddress, capacityWei);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Failed to register nanogrid:', error);
      throw error;
    }
  }, [contract]);

  // Report energy surplus
  const reportEnergySurplus = useCallback(async (surplusInKwh: number) => {
    if (!contract || !walletState.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const surplusWei = ethers.parseEther(surplusInKwh.toString());
      const tx = await contract.reportEnergySurplus(surplusWei);
      await tx.wait();
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to report energy surplus:', error);
      throw error;
    }
  }, [contract, walletState.address]);

  // Record interval data to blockchain
  const recordIntervalData = useCallback(async (
    nanogridId: number,
    solarOutput: number,
    loadDemand: number,
    batterySoC: number,
    powerBalance: number,
    gridExport: number,
    evSales: number
  ) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      const tx = await contract.recordIntervalData(
        nanogridId,
        ethers.parseEther(solarOutput.toString()),
        ethers.parseEther(loadDemand.toString()),
        ethers.parseEther(batterySoC.toString()),
        ethers.parseEther(powerBalance.toString()),
        ethers.parseEther(gridExport.toString()),
        ethers.parseEther(evSales.toString())
      );
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Failed to record interval data:', error);
      throw error;
    }
  }, [contract]);

  // Record revenue to blockchain
  const recordRevenue = useCallback(async (
    nanogridId: number,
    gridExportKwh: number,
    evSalesKwh: number,
    isPeakHour: boolean
  ) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      const tx = await contract.recordRevenue(
        nanogridId,
        ethers.parseEther(gridExportKwh.toString()),
        ethers.parseEther(evSalesKwh.toString()),
        isPeakHour
      );
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Failed to record revenue:', error);
      throw error;
    }
  }, [contract]);

  // Execute P2P trade
  const executeP2PTrade = useCallback(async (buyerAddress: string, amountInKwh: number) => {
    if (!contract || !walletState.address) {
      throw new Error('Wallet not connected');
    }

    try {
      const amountWei = ethers.parseEther(amountInKwh.toString());
      const tx = await contract.executeP2PTrade(buyerAddress, amountWei);
      await tx.wait();
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to execute P2P trade:', error);
      throw error;
    }
  }, [contract, walletState.address]);

  // Get prosumer energy balance
  const getEnergyBalance = useCallback(async (address?: string): Promise<number> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const targetAddress = address || walletState.address;
      if (!targetAddress) {
        throw new Error('No address provided');
      }

      const balanceWei = await contract.prosumerEnergyBalance(targetAddress);
      return parseFloat(ethers.formatEther(balanceWei));
    } catch (error) {
      console.error('Failed to get energy balance:', error);
      return 0;
    }
  }, [contract, walletState.address]);

  // Get all transactions
  const getTransactions = useCallback(async (): Promise<BlockchainTransaction[]> => {
    if (!contract) return [];

    try {
      const transactions = await contract.getTransactions();
      return transactions.map((tx: any, index: number) => ({
        tx_id: `tx_${index}`,
        sender: tx.sender,
        receiver: tx.receiver,
        amountInKwh: ethers.formatEther(tx.amountInKwh),
        pricePerKwh: tx.pricePerKwh?.toString() || '0',
        totalRevenue: tx.totalRevenue ? ethers.formatEther(tx.totalRevenue) : '0',
        timestamp: tx.timestamp.toString()
      }));
    } catch (error) {
      console.error('Failed to get transactions:', error);
      return [];
    }
  }, [contract]);

  // Get all interval records from blockchain
  const getAllIntervalRecords = useCallback(async (): Promise<BlockchainIntervalRecord[]> => {
    if (!contract) return [];

    try {
      const records = await contract.getAllIntervalRecords();
      return records.map((r: any) => ({
        nanogridId: Number(r.nanogridId),
        solarOutput: parseFloat(ethers.formatEther(r.solarOutput)),
        loadDemand: parseFloat(ethers.formatEther(r.loadDemand)),
        batterySoC: parseFloat(ethers.formatEther(r.batterySoC)),
        powerBalance: parseFloat(ethers.formatEther(r.powerBalance)),
        gridExport: parseFloat(ethers.formatEther(r.gridExport)),
        evSales: parseFloat(ethers.formatEther(r.evSales)),
        timestamp: Number(r.timestamp) * 1000
      }));
    } catch (error) {
      console.error('Failed to get interval records:', error);
      return [];
    }
  }, [contract]);

  // Get all nanogrids from blockchain
  const getAllNanogrids = useCallback(async (): Promise<BlockchainNanogrid[]> => {
    if (!contract) return [];

    try {
      const nanogrids = await contract.getAllNanogrids();
      return nanogrids.map((ng: any) => ({
        owner: ng.owner,
        nanogridId: Number(ng.nanogridId),
        totalGeneration: parseFloat(ethers.formatEther(ng.totalGeneration)),
        totalConsumption: parseFloat(ethers.formatEther(ng.totalConsumption)),
        batteryCapacity: parseFloat(ethers.formatEther(ng.batteryCapacity)),
        batterySoC: parseFloat(ethers.formatEther(ng.batterySoC)),
        gridExportRevenue: parseFloat(ethers.formatEther(ng.gridExportRevenue)),
        evSalesRevenue: parseFloat(ethers.formatEther(ng.evSalesRevenue)),
        lastUpdated: Number(ng.lastUpdated) * 1000,
        isActive: ng.isActive
      }));
    } catch (error) {
      console.error('Failed to get nanogrids:', error);
      return [];
    }
  }, [contract]);

  // Get total revenue for an address
  const getTotalRevenue = useCallback(async (address: string): Promise<BlockchainRevenue> => {
    if (!contract) return { gridRevenue: 0, evRevenue: 0, p2pRevenue: 0, totalRevenue: 0 };

    try {
      const result = await contract.getTotalRevenue(address);
      return {
        gridRevenue: parseFloat(ethers.formatEther(result.gridRevenue)),
        evRevenue: parseFloat(ethers.formatEther(result.evRevenue)),
        p2pRevenue: parseFloat(ethers.formatEther(result.p2pRevenue)),
        totalRevenue: parseFloat(ethers.formatEther(result.totalRevenue))
      };
    } catch (error) {
      console.error('Failed to get total revenue:', error);
      return { gridRevenue: 0, evRevenue: 0, p2pRevenue: 0, totalRevenue: 0 };
    }
  }, [contract]);

  // Get network information
  const getNetworkInfo = useCallback(async () => {
    if (!provider) return null;
    
    try {
      const network = await provider.getNetwork();
      return {
        chainId: Number(network.chainId),
        name: network.name,
        isCustomNetwork: Number(network.chainId) === CUSTOM_NETWORK.chainId
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }, [provider]);

  // Subscribe to blockchain events
  const subscribeToEvents = useCallback((callbacks: {
    onTradeCompleted?: (seller: string, buyer: string, amount: bigint, pricePerKwh: bigint, totalRevenue: bigint, timestamp: bigint) => void;
    onEnergyReported?: (prosumer: string, newBalance: bigint) => void;
    onProsumerRegistered?: (prosumer: string) => void;
    onIntervalRecorded?: (nanogridId: bigint, solarOutput: bigint, loadDemand: bigint, timestamp: bigint) => void;
    onRevenueRecorded?: (nanogrid: string, gridRevenue: bigint, evRevenue: bigint, timestamp: bigint) => void;
  }) => {
    if (!contract) {
      console.warn('Contract not initialized, cannot subscribe to events');
      return () => {};
    }

    try {
      if (callbacks.onTradeCompleted) {
        contract.on('TradeCompleted', callbacks.onTradeCompleted);
      }
      if (callbacks.onEnergyReported) {
        contract.on('EnergyReported', callbacks.onEnergyReported);
      }
      if (callbacks.onProsumerRegistered) {
        contract.on('ProsumerRegistered', callbacks.onProsumerRegistered);
      }
      if (callbacks.onIntervalRecorded) {
        contract.on('IntervalRecorded', callbacks.onIntervalRecorded);
      }
      if (callbacks.onRevenueRecorded) {
        contract.on('RevenueRecorded', callbacks.onRevenueRecorded);
      }

      return () => {
        if (callbacks.onTradeCompleted) contract.off('TradeCompleted', callbacks.onTradeCompleted);
        if (callbacks.onEnergyReported) contract.off('EnergyReported', callbacks.onEnergyReported);
        if (callbacks.onProsumerRegistered) contract.off('ProsumerRegistered', callbacks.onProsumerRegistered);
        if (callbacks.onIntervalRecorded) contract.off('IntervalRecorded', callbacks.onIntervalRecorded);
        if (callbacks.onRevenueRecorded) contract.off('RevenueRecorded', callbacks.onRevenueRecorded);
      };
    } catch (error) {
      console.error('Failed to subscribe to events:', error);
      return () => {};
    }
  }, [contract]);

  // Listen for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== walletState.address) {
          connectWallet().catch(console.error);
        }
      };

      const handleChainChanged = (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        if (newChainId !== CUSTOM_NETWORK.chainId) {
          console.warn('Please switch back to the Truffle Development Network');
        }
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [walletState.address, connectWallet, disconnectWallet]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            
            if (currentChainId === CUSTOM_NETWORK.chainId) {
              await initializeEthers();
            }
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
        }
      }
    };

    autoConnect();
  }, [initializeEthers]);

  return {
    provider,
    signer,
    contract,
    walletState,
    isBlockchainConnected,
    connectWallet,
    disconnectWallet,
    registerProsumer,
    registerNanogrid,
    reportEnergySurplus,
    recordIntervalData,
    recordRevenue,
    executeP2PTrade,
    getEnergyBalance,
    getTransactions,
    getAllIntervalRecords,
    getAllNanogrids,
    getTotalRevenue,
    getNetworkInfo,
    addCustomNetwork,
    subscribeToEvents,
    isMetaMaskInstalled: typeof window.ethereum !== 'undefined',
    customNetwork: CUSTOM_NETWORK,
    nanogridAddresses: NANOGRID_ADDRESSES,
    allNanogridAddresses: ALL_NANOGRID_ADDRESSES
  };
};

// Extend window object for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
