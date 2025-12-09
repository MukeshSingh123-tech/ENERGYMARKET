/**
 * Blockchain Configuration
 * Update these values after deploying your smart contract
 */

export const BLOCKCHAIN_CONFIG = {
  // Network Configuration
  network: {
    chainId: 1337,
    name: 'Truffle Development Network',
    rpcUrl: 'http://127.0.0.1:8545',
    chainName: 'Ganache Local',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  
  // Smart Contract Address (Update this after deployment)
  contractAddress: '0xd25B8DE4715326bd1Ae5505E9E2f6a0AD1cE1fE8',
  
  // Gas Configuration
  gas: {
    limit: 6721975,
    price: 20000000000 // 20 Gwei
  }
};

// Nanogrid Addresses (from truffle develop accounts)
export const NANOGRID_ADDRESSES = {
  owner: '0x69954b38F8f72aBAc68B18D1A457cB0c1E289bB8',
  prosumer: '0x1cccCcE2DB8b812460F45f055d4eCeed96c51179',
  nanogrid1: '0x1c7ec954763d3e3bbdf49998cd3065d62a422188',
  nanogrid2: '0x307fb4d7E5Bbc94FA9d361b55fE27DfcD3E91600',
  nanogrid3: '0x2a750da8BBC90f70375f77261dFEfd9377Ce699f',
  nanogrid4: '0xe03a58DE774a1964895A91eD381150E3c1Faa2ca',
  nanogrid5: '0xCB8136027c26CDC822F5fD3eDa844183Bd42dA91'
};

// Infrastructure Addresses (from truffle develop accounts)
export const INFRASTRUCTURE_ADDRESSES = {
  stateGrid: '0x791EaE915c34f7C8e8afB8aF4Ea8f1fe21D70A3B',
  evStation: '0x2FD0147D47549f182cFAB4f3d83333F5f640A99E',
  centralBattery: '0x91d337DAE49Dd49EfF36CbCdB120749B98d33478'
};

// All nanogrid addresses array
export const ALL_NANOGRID_ADDRESSES = [
  NANOGRID_ADDRESSES.nanogrid1,
  NANOGRID_ADDRESSES.nanogrid2,
  NANOGRID_ADDRESSES.nanogrid3,
  NANOGRID_ADDRESSES.nanogrid4,
  NANOGRID_ADDRESSES.nanogrid5
];

// Pricing Configuration ($/kWh)
export const ENERGY_PRICING = {
  stateGrid: {
    sellPrice: 0.12,  // Price when selling to grid
    buyPrice: 0.15,   // Price when buying from grid
  },
  evStation: {
    sellPrice: 0.18,  // Premium price for EV charging
  },
  p2pTrade: {
    basePrice: 0.14,  // Base P2P trading price
  }
};

// Export for backward compatibility
export const CUSTOM_NETWORK = BLOCKCHAIN_CONFIG.network;
export const CONTRACT_ADDRESS = BLOCKCHAIN_CONFIG.contractAddress;
