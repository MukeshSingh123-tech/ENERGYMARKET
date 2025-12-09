module.exports = {
  networks: {
    // your networks (development etc.) — keep whatever you already have
    development: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*"
    }
  },

  compilers: {
    solc: {
      version: "0.8.24",    // <-- use the exact compiler your contract needs
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
