require('@nomiclabs/hardhat-waffle')
const { defaultAccounts } = require('ethereum-waffle')
const fs = require('fs')
const privateKey = fs.readFileSync('.secret').toString()
const mumbaiId = 'JPL9FP6hDz5YZ6TRo9cP0MKZwcsQq1wB'
const mainnetId = 'EwNM9b6mlCD4RugYsizPU6f_y5_7qFWI'

module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${mumbaiId}`,
      accounts: [privateKey],
    },
    mainnet: {
      url: 'https://polygon-mainnet.g.alchemy.com/v2/${mainnetId}',
      accounts: [privateKey],
    },
  },
  solidity: '0.8.4',
}
