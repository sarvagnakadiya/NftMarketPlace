const main = async () => {
  //marketplace contract
  // const marketPlaceContractFactory = await hre.ethers.getContractFactory('NFTMarket');
  // const marketPlaceContract = await marketPlaceContractFactory.deploy();
  // await marketPlaceContract.deployed();
  // console.log("MarketPlace contract deployed to:", marketPlaceContract.address);

  //nft contract
  const nftContractFactory = await hre.ethers.getContractFactory('MyEpicNFT');
  const nftContract = await nftContractFactory.deploy();
  await nftContract.deployed();
  console.log(" NFT contract deployed to:", nftContract.address);

  // Call the function.
  let txn = await nftContract.makeAnEpicNFT()
  // Wait for it to be mined.
  await txn.wait()
  console.log("Minted NFT #1")

  txn = await nftContract.makeAnEpicNFT()
  // Wait for it to be mined.
  await txn.wait()
  console.log("Minted NFT #2")


};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();