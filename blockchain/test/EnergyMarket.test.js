const EnergyMarket = artifacts.require("EnergyMarket");

contract("EnergyMarket", (accounts) => {
    // Define accounts for easier reference in tests
    const owner = accounts[0];
    const prosumer1 = accounts[1];
    const prosumer2 = accounts[2];
    const unregisteredUser = accounts[3];

    let energyMarketInstance;

    before(async () => {
        // Deploy a new instance of the contract before running tests
        energyMarketInstance = await EnergyMarket.new(owner);
    });

    describe("Deployment", () => {
        it("should deploy the contract correctly", async () => {
            const contractOwner = await energyMarketInstance.owner();
            assert.equal(contractOwner, owner, "Owner address is incorrect");
        });
    });

    describe("Prosumer Registration", () => {
        it("should allow the owner to register a new prosumer", async () => {
            await energyMarketInstance.registerProsumer(prosumer1, { from: owner });
            const isProsumer1Registered = await energyMarketInstance.isProsumer(prosumer1);
            assert.equal(isProsumer1Registered, true, "Prosumer1 was not registered");
        });

        it("should not allow a non-owner to register a prosumer", async () => {
            try {
                await energyMarketInstance.registerProsumer(prosumer2, { from: prosumer1 });
                assert.fail("Non-owner was able to register a prosumer");
            } catch (error) {
                // The new error message for a failing onlyOwner modifier is a custom error
                assert.include(error.message, "caller is not the owner", "Expected Ownable error was not thrown");
            }
        });
        
        it("should not allow a prosumer to be registered twice", async () => {
            try {
                await energyMarketInstance.registerProsumer(prosumer1, { from: owner });
                assert.fail("Prosumer was registered twice");
            } catch (error) {
                assert.include(error.message, "Prosumer is already registered", "Expected registration error was not thrown");
            }
        });

        it("should start a new prosumer with a zero energy balance", async () => {
            const balance = await energyMarketInstance.prosumerEnergyBalance(prosumer1);
            assert.equal(balance.toNumber(), 0, "Initial energy balance was not zero");
        });
    });

    describe("Energy Management", () => {
        it("should allow a registered prosumer to report energy surplus", async () => {
            const surplusAmount = 100;
            await energyMarketInstance.reportEnergySurplus(surplusAmount, { from: prosumer1 });
            const newBalance = await energyMarketInstance.prosumerEnergyBalance(prosumer1);
            assert.equal(newBalance.toNumber(), surplusAmount, "Energy balance was not updated correctly");
        });

        it("should not allow an unregistered user to report energy surplus", async () => {
            try {
                await energyMarketInstance.reportEnergySurplus(50, { from: unregisteredUser });
                assert.fail("Unregistered user was able to report energy");
            } catch (error) {
                assert.include(error.message, "Only registered prosumers can perform this action.", "Expected registration error was not thrown");
            }
        });
    });

    describe("P2P Trading", () => {
        before(async () => {
            // Register prosumer2 and add some balance for testing trades
            await energyMarketInstance.registerProsumer(prosumer2, { from: owner });
            await energyMarketInstance.reportEnergySurplus(100, { from: prosumer2 });
        });

        it("should successfully execute a trade between two prosumers", async () => {
            const tradeAmount = 50;
            const initialBalance1 = (await energyMarketInstance.prosumerEnergyBalance(prosumer1)).toNumber();
            const initialBalance2 = (await energyMarketInstance.prosumerEnergyBalance(prosumer2)).toNumber();

            const tx = await energyMarketInstance.executeP2PTrade(prosumer1, tradeAmount, { from: prosumer2 });

            const finalBalance1 = (await energyMarketInstance.prosumerEnergyBalance(prosumer1)).toNumber();
            const finalBalance2 = (await energyMarketInstance.prosumerEnergyBalance(prosumer2)).toNumber();

            assert.equal(finalBalance1, initialBalance1 + tradeAmount, "Buyer's balance was not updated correctly");
            assert.equal(finalBalance2, initialBalance2 - tradeAmount, "Seller's balance was not updated correctly");

            const tradeEvent = tx.logs.find(log => log.event === 'TradeCompleted');
            assert.equal(tradeEvent.args.seller, prosumer2, "TradeCompleted event emitted wrong seller");
            assert.equal(tradeEvent.args.buyer, prosumer1, "TradeCompleted event emitted wrong buyer");
            assert.equal(tradeEvent.args.amountInKwh.toNumber(), tradeAmount, "TradeCompleted event emitted wrong amount");
        });

        it("should not allow a trade with insufficient balance", async () => {
            const tradeAmount = 200; // More than prosumer2 has
            try {
                await energyMarketInstance.executeP2PTrade(prosumer1, tradeAmount, { from: prosumer2 });
                assert.fail("Trade with insufficient balance was allowed");
            } catch (error) {
                assert.include(error.message, "Insufficient energy balance.", "Expected insufficient balance error was not thrown");
            }
        });

        it("should not allow a trade to an invalid buyer address", async () => {
            const tradeAmount = 10;
            try {
                await energyMarketInstance.executeP2PTrade("0x0000000000000000000000000000000000000000", tradeAmount, { from: prosumer2 });
                assert.fail("Trade to an invalid address was allowed");
            } catch (error) {
                assert.include(error.message, "Invalid buyer address", "Expected invalid buyer address error was not thrown");
            }
        });
    });
});
