JackoCoinCrowdsale = artifacts.require("./JackoCoinCrowdsale.sol")

module.exports = function(deployer, network, accounts) {
  const startBlock = web3.eth.blockNumber + 2 // blockchain block number where the crowdsale will commence. Here I just taking the current block that the contract and setting that the crowdsale starts two block after
  const endBlock = startBlock + 300  // blockchain block number where it will end. 300 is little over an hour.
  const rate = 1// rate of ether to Jacko Coin in wei (1 ETH = 1 JAK)
  const wallet = web3.eth.accounts[3] // the address that will hold the fund. Recommended to use a multisig one for security.

  deployer.deploy(JackoCoinCrowdsale, startBlock, endBlock, rate, wallet)
}
