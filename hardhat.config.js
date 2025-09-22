import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  mocha: {
    timeout: 100000
  }
};


const config = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    artifacts: "./frontend/src/artifacts",
  },
};

export default config;