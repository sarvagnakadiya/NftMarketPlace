require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config({ path: ".env" });

module.exports = {
  solidity: '0.8.4',
  paths: {
    artifacts: "./src/artifacts",
  },
  networks: {
    rinkeby: {
      url: process.env.ALCHEMY_API_KEY_URL,
      accounts: [process.env.RINKEBY_PRIVATE_KEY],
    },
  },
};
