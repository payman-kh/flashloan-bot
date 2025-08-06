require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: '../.env' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
        blockNumber: 18900000
      },
      mining: {
        auto: true,
        interval: 0
      },
      hardfork: "london",
      gasPrice: "auto",
      initialBaseFeePerGas: 0, // This helps with the gas fee issues
      accounts: {
        accountsBalance: "10000000000000000000000" // 10000 ETH per account
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};