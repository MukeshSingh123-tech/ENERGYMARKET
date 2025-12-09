const EnergyMarket = artifacts.require("EnergyMarket");

module.exports = function (deployer, network, accounts) {
  // use the first dev account as the initialOwner
  const initialOwner = accounts[0];
  deployer.deploy(EnergyMarket, initialOwner);
};
