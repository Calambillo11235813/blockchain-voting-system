import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-deploy"
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "zkSyncSepolia",
  networks: {
    zkSyncSepolia: {
      url: process.env.ALCHEMY_URL || "",
      ethNetwork: process.env.ALCHEMY_URL_ETH || "",
      zksync: true,
      accounts: [process.env.PRIVATE_KEY || ""],

    },
  },
  zksolc: {
    version: "1.5.7",
    settings: {

    },

  },
};

export default config;