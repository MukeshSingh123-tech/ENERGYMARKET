// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EnergyMarket
 * @dev Decentralized peer-to-peer energy trading smart contract with revenue tracking
 */
contract EnergyMarket is Ownable {
    
    struct Transaction {
        address sender;
        address receiver;
        uint256 amountInKwh;
        uint256 pricePerKwh;
        uint256 totalRevenue;
        uint256 timestamp;
    }
    
    struct Nanogrid {
        address owner;
        uint256 nanogridId;
        uint256 totalGeneration;
        uint256 totalConsumption;
        uint256 batteryCapacity;
        uint256 batterySoC;
        uint256 gridExportRevenue;
        uint256 evSalesRevenue;
        uint256 lastUpdated;
        bool isActive;
    }
    
    struct IntervalRecord {
        uint256 nanogridId;
        uint256 solarOutput;
        uint256 loadDemand;
        uint256 batterySoC;
        int256 powerBalance;
        uint256 gridExport;
        uint256 evSales;
        uint256 timestamp;
    }
    
    // Mappings
    mapping(address => bool) public isProsumer;
    mapping(address => uint256) public prosumerEnergyBalance;
    mapping(uint256 => Nanogrid) public nanogrids;
    mapping(address => uint256) public addressToNanogridId;
    
    // Revenue tracking
    mapping(address => uint256) public totalGridRevenue;
    mapping(address => uint256) public totalEVRevenue;
    mapping(address => uint256) public totalP2PRevenue;
    
    // Transaction history
    Transaction[] public transactionHistory;
    IntervalRecord[] public intervalRecords;
    
    // Nanogrid addresses
    uint256 public nanogridCount;
    address[] public nanogridAddresses;
    
    // Pricing (in wei, 1 wei = 0.01 cents)
    uint256 public gridPricePerKwh = 12; // $0.12
    uint256 public evPricePerKwh = 18;   // $0.18
    uint256 public peakMultiplier = 150; // 1.5x (150/100)
    
    // Events
    event ProsumerRegistered(address indexed prosumer);
    event NanogridRegistered(address indexed owner, uint256 indexed nanogridId);
    event EnergyReported(address indexed prosumer, uint256 newBalance);
    event TradeCompleted(
        address indexed seller,
        address indexed buyer,
        uint256 amountInKwh,
        uint256 pricePerKwh,
        uint256 totalRevenue,
        uint256 timestamp
    );
    event RevenueRecorded(
        address indexed nanogrid,
        uint256 gridRevenue,
        uint256 evRevenue,
        uint256 timestamp
    );
    event IntervalRecorded(
        uint256 indexed nanogridId,
        uint256 solarOutput,
        uint256 loadDemand,
        uint256 timestamp
    );
    event NanogridUpdated(
        uint256 indexed nanogridId,
        uint256 generation,
        uint256 consumption,
        uint256 batterySoC
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Register as a new prosumer (uses caller's address)
     */
    function registerProsumer() external {
        require(!isProsumer[msg.sender], "Already registered as prosumer");
        
        isProsumer[msg.sender] = true;
        prosumerEnergyBalance[msg.sender] = 0;
        
        emit ProsumerRegistered(msg.sender);
    }
    
    /**
     * @dev Register a nanogrid with specific address
     */
    function registerNanogrid(address _nanogridAddress, uint256 _batteryCapacity) external onlyOwner {
        require(addressToNanogridId[_nanogridAddress] == 0, "Nanogrid already registered");
        
        nanogridCount++;
        
        nanogrids[nanogridCount] = Nanogrid({
            owner: _nanogridAddress,
            nanogridId: nanogridCount,
            totalGeneration: 0,
            totalConsumption: 0,
            batteryCapacity: _batteryCapacity,
            batterySoC: 0,
            gridExportRevenue: 0,
            evSalesRevenue: 0,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        addressToNanogridId[_nanogridAddress] = nanogridCount;
        nanogridAddresses.push(_nanogridAddress);
        
        // Auto-register as prosumer
        if (!isProsumer[_nanogridAddress]) {
            isProsumer[_nanogridAddress] = true;
        }
        
        emit NanogridRegistered(_nanogridAddress, nanogridCount);
    }
    
    /**
     * @dev Report energy surplus
     */
    function reportEnergySurplus(uint256 _surplusInKwh) external {
        require(isProsumer[msg.sender], "Not a registered prosumer");
        require(_surplusInKwh > 0, "Surplus must be greater than zero");
        
        prosumerEnergyBalance[msg.sender] += _surplusInKwh;
        
        emit EnergyReported(msg.sender, prosumerEnergyBalance[msg.sender]);
    }
    
    /**
     * @dev Update nanogrid metrics
     */
    function updateNanogridMetrics(
        uint256 _nanogridId,
        uint256 _generation,
        uint256 _consumption,
        uint256 _batterySoC
    ) external {
        require(_nanogridId > 0 && _nanogridId <= nanogridCount, "Invalid nanogrid ID");
        Nanogrid storage ng = nanogrids[_nanogridId];
        require(msg.sender == ng.owner || msg.sender == owner(), "Not authorized");
        
        ng.totalGeneration += _generation;
        ng.totalConsumption += _consumption;
        ng.batterySoC = _batterySoC;
        ng.lastUpdated = block.timestamp;
        
        emit NanogridUpdated(_nanogridId, _generation, _consumption, _batterySoC);
    }
    
    /**
     * @dev Record interval data for 15-minute slots
     */
    function recordIntervalData(
        uint256 _nanogridId,
        uint256 _solarOutput,
        uint256 _loadDemand,
        uint256 _batterySoC,
        int256 _powerBalance,
        uint256 _gridExport,
        uint256 _evSales
    ) external {
        require(_nanogridId > 0 && _nanogridId <= nanogridCount, "Invalid nanogrid ID");
        Nanogrid storage ng = nanogrids[_nanogridId];
        require(msg.sender == ng.owner || msg.sender == owner(), "Not authorized");
        
        intervalRecords.push(IntervalRecord({
            nanogridId: _nanogridId,
            solarOutput: _solarOutput,
            loadDemand: _loadDemand,
            batterySoC: _batterySoC,
            powerBalance: _powerBalance,
            gridExport: _gridExport,
            evSales: _evSales,
            timestamp: block.timestamp
        }));
        
        emit IntervalRecorded(_nanogridId, _solarOutput, _loadDemand, block.timestamp);
    }
    
    /**
     * @dev Record revenue from grid export and EV sales
     */
    function recordRevenue(
        uint256 _nanogridId,
        uint256 _gridExportKwh,
        uint256 _evSalesKwh,
        bool _isPeakHour
    ) external {
        require(_nanogridId > 0 && _nanogridId <= nanogridCount, "Invalid nanogrid ID");
        Nanogrid storage ng = nanogrids[_nanogridId];
        require(msg.sender == ng.owner || msg.sender == owner(), "Not authorized");
        
        uint256 multiplier = _isPeakHour ? peakMultiplier : 100;
        
        uint256 gridRevenue = (_gridExportKwh * gridPricePerKwh * multiplier) / 100;
        uint256 evRevenue = (_evSalesKwh * evPricePerKwh * multiplier) / 100;
        
        ng.gridExportRevenue += gridRevenue;
        ng.evSalesRevenue += evRevenue;
        
        totalGridRevenue[ng.owner] += gridRevenue;
        totalEVRevenue[ng.owner] += evRevenue;
        
        emit RevenueRecorded(ng.owner, gridRevenue, evRevenue, block.timestamp);
    }
    
    /**
     * @dev Execute peer-to-peer energy trade with pricing
     */
    function executeP2PTrade(address _buyer, uint256 _amountInKwh) external {
        require(isProsumer[msg.sender], "Seller not a registered prosumer");
        require(isProsumer[_buyer], "Buyer not a registered prosumer");
        require(_amountInKwh > 0, "Amount must be greater than zero");
        require(
            prosumerEnergyBalance[msg.sender] >= _amountInKwh,
            "Insufficient energy balance"
        );
        
        // Calculate price (average of grid and EV prices for P2P)
        uint256 pricePerKwh = (gridPricePerKwh + evPricePerKwh) / 2;
        uint256 totalRevenue = _amountInKwh * pricePerKwh;
        
        // Transfer energy
        prosumerEnergyBalance[msg.sender] -= _amountInKwh;
        prosumerEnergyBalance[_buyer] += _amountInKwh;
        
        // Track P2P revenue
        totalP2PRevenue[msg.sender] += totalRevenue;
        
        // Record transaction
        transactionHistory.push(
            Transaction({
                sender: msg.sender,
                receiver: _buyer,
                amountInKwh: _amountInKwh,
                pricePerKwh: pricePerKwh,
                totalRevenue: totalRevenue,
                timestamp: block.timestamp
            })
        );
        
        emit TradeCompleted(msg.sender, _buyer, _amountInKwh, pricePerKwh, totalRevenue, block.timestamp);
    }
    
    /**
     * @dev Update pricing (owner only)
     */
    function updatePricing(
        uint256 _gridPricePerKwh,
        uint256 _evPricePerKwh,
        uint256 _peakMultiplier
    ) external onlyOwner {
        gridPricePerKwh = _gridPricePerKwh;
        evPricePerKwh = _evPricePerKwh;
        peakMultiplier = _peakMultiplier;
    }
    
    /**
     * @dev Get all transactions
     */
    function getTransactions() external view returns (Transaction[] memory) {
        return transactionHistory;
    }
    
    /**
     * @dev Get interval records for a nanogrid
     */
    function getIntervalRecords(uint256 _nanogridId) external view returns (IntervalRecord[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < intervalRecords.length; i++) {
            if (intervalRecords[i].nanogridId == _nanogridId) {
                count++;
            }
        }
        
        IntervalRecord[] memory records = new IntervalRecord[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < intervalRecords.length; i++) {
            if (intervalRecords[i].nanogridId == _nanogridId) {
                records[index] = intervalRecords[i];
                index++;
            }
        }
        
        return records;
    }
    
    /**
     * @dev Get all interval records
     */
    function getAllIntervalRecords() external view returns (IntervalRecord[] memory) {
        return intervalRecords;
    }
    
    /**
     * @dev Get nanogrid details
     */
    function getNanogrid(uint256 _nanogridId) external view returns (Nanogrid memory) {
        require(_nanogridId > 0 && _nanogridId <= nanogridCount, "Invalid nanogrid ID");
        return nanogrids[_nanogridId];
    }
    
    /**
     * @dev Get all nanogrids
     */
    function getAllNanogrids() external view returns (Nanogrid[] memory) {
        Nanogrid[] memory allNanogrids = new Nanogrid[](nanogridCount);
        for (uint256 i = 1; i <= nanogridCount; i++) {
            allNanogrids[i - 1] = nanogrids[i];
        }
        return allNanogrids;
    }
    
    /**
     * @dev Get total revenue for an address
     */
    function getTotalRevenue(address _address) external view returns (
        uint256 gridRevenue,
        uint256 evRevenue,
        uint256 p2pRevenue,
        uint256 totalRevenue
    ) {
        gridRevenue = totalGridRevenue[_address];
        evRevenue = totalEVRevenue[_address];
        p2pRevenue = totalP2PRevenue[_address];
        totalRevenue = gridRevenue + evRevenue + p2pRevenue;
    }
    
    /**
     * @dev Get nanogrid count
     */
    function getNanogridCount() external view returns (uint256) {
        return nanogridCount;
    }
}
