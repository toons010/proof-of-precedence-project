require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Hardhat configuration.
 *
 * Supports two networks:
 *   • localhost  – local Hardhat node (default for development)
 *   • mumbai     – Polygon Mumbai testnet (needs PRIVATE_KEY + RPC_URL in .env)
 *
 * Run local node:  npx hardhat node
 * Deploy locally:  npx hardhat run scripts/deploy.js --network localhost
 * Deploy Mumbai:   npx hardhat run scripts/deploy.js --network mumbai
 */

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64); // fallback so compile works without .env
const RPC_URL     = process.env.RPC_URL     || "https://rpc-mumbai.maticvigil.com";

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
    // ── Local Hardhat node ──────────────────────────────────────────
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // ── Polygon Mumbai testnet ──────────────────────────────────────
    mumbai: {
      url: RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 80001,
      gasPrice: 20000000000, // 20 gwei
    },
  },

  // Etherscan/Polygonscan verification (optional)
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },

  // Default paths (kept explicit for clarity)
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
