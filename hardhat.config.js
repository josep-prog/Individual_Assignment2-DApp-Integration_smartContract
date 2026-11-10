require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");

// Testnet settings come from a local .env file (see .env.example).
const { SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

const networks = {
  // Local node started with `npx hardhat node`.
  localhost: {
    url: "http://127.0.0.1:8545",
  },
};

// Only add Sepolia when its settings exist, so local work needs no .env.
if (SEPOLIA_RPC_URL && PRIVATE_KEY) {
  networks.sepolia = {
    url: SEPOLIA_RPC_URL,
    accounts: [PRIVATE_KEY],
    chainId: 11155111,
  };
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks,

  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },

  sourcify: {
    enabled: false,
  },
};
