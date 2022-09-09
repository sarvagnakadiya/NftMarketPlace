import './App.css';
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import myEpicNft from './artifacts/contracts/myEpicNFT.sol/MyEpicNFT.json';
import EpicMarketPlace from './artifacts/contracts/EpicMarketPlace.sol/NFTMarket.json';

const TOTAL_MINT_COUNT = 50;

// I moved the contract address to the top for easy access.
const CONTRACT_ADDRESS = "0x62B4b143034fb5DB9e8EA447bb5BE3d09cD47Bd1";
const MARKETPLACE_ADDRESS = "0x5d6D068Aa1E1591A93709acf03803DDf343AdAeD";
const OPENSEA_LINK = '';

const App = () => {
  const [tokenIdConst, setTokenId] = useState("");
  const [currentAccount, setCurrentAccount] = useState("");

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: 'eth_accounts' });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account)

      // Setup listener! This is for the case where a user comes to our site
      // and ALREADY had their wallet connected + authorized.
      setupEventListener()
    } else {
      console.log("No authorized account found")
    }
  }

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);

      // Setup listener! This is for the case where a user comes to our site
      // and connected their wallet for the first time.
      setupEventListener()
    } catch (error) {
      console.log(error)
    }
  }

  // Setup our listener.
  const setupEventListener = async () => {
    // Most of this looks the same as our function askContractToMintNft
    try {
      const { ethereum } = window;

      if (ethereum) {
        // Same stuff again
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        // // THIS IS THE MAGIC SAUCE.
        // // This will essentially "capture" our event when our contract throws it.
        // // If you're familiar with webhooks, it's very similar to that!
        // connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
        //   console.log(from, tokenId.toNumber())
        //   // use state for setting up tokenID
        //   setTokenId(tokenId)
        //   alert(`Hey there! We've minted your NFT and sent it to your wallet. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`)
        // });

        console.log("Setup event listener!")

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      connectWallet();
      console.log(error)
    }
  }

  const askContractToMintNft = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.makeAnEpicNFT();
        console.log(nftTxn);
        //usestate here
        // setSvg(nftTxn);

        console.log("Mining...please wait.")
        await nftTxn.wait();

        // THIS IS THE MAGIC SAUCE.
        // This will essentially "capture" our event when our contract throws it.
        // If you're familiar with webhooks, it's very similar to that!
        connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber())
          // use state for setting up tokenID
          setTokenId(tokenId)
          alert(`Hey there! We've minted your NFT and sent it to your wallet. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`)
        });

        console.log(nftTxn);
        console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);



      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      connectWallet();
      console.log(error)
    }
  }

  const askContractToListNft = async (e) => {
    e.preventDefault();
    const dropDays = e.target.dropDays_id.value;
    console.log(dropDays);
    const auctionDays = e.target.auctionDays_id.value;
    console.log(typeof auctionDays);
    const price = e.target.price_id.value;
    // const fee = 20000;
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(MARKETPLACE_ADDRESS, EpicMarketPlace.abi, signer);
        // const fee = 20000;
        // let f = await connectedContract.fetchMsgValue({ value: fee });
        // await f.wait();
        // console.log(f);


        // const tx = await connectedContract.participate({ value: fee });
        // tx.wait();
        console.log("Going to pop wallet to pay gas for Creating Item...")
        let nftTxn = await connectedContract.createItem(CONTRACT_ADDRESS, 0, Number(dropDays), Number(auctionDays), Number(price));
        console.log(nftTxn);

        console.log("Creating Item...please wait.")
        await nftTxn.wait();
        console.log(nftTxn);
        console.log(`Listed, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      connectWallet();
      console.log(error)
    }
  }

  //-----------------------------------------------------------------------------Bid
  const askContractToBidNft = async (e) => {
    e.preventDefault();
    const itemId = e.target.itemId_id.value;
    console.log(itemId);
    const bidValue = e.target.bidValue_id.value;
    console.log(bidValue);

    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(MARKETPLACE_ADDRESS, EpicMarketPlace.abi, signer);

        console.log("Going to pop wallet to pay gas for Bidding Item...")
        let nftTxn = await connectedContract.bid(itemId, { value: bidValue });
        console.log(nftTxn);

        console.log("Placing Bid...please wait.")
        await nftTxn.wait();
        console.log(nftTxn);
        console.log(`Listed, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      connectWallet();
      console.log(error)
    }
  }

  //auction End
  const askContractToEndAuction = async (e) => {
    e.preventDefault();
    const itemId = e.target.itemId_a_id.value;
    console.log(itemId);
    const price = e.target.price_id.value;
    console.log(price);

    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(MARKETPLACE_ADDRESS, EpicMarketPlace.abi, signer);

        console.log("Going to pop wallet to pay gas for Bidding Item...")
        let nftTxn = await connectedContract.auctionEnd(itemId, price);
        console.log(nftTxn);

        console.log("Auction ending...please wait.")
        await nftTxn.wait();
        console.log(nftTxn);
        console.log(`Auction Ended, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      connectWallet();
      console.log(error)
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet} className="cta-button connect-wallet-button">
      Connect to Wallet
    </button>
  );

  const renderMintUI = () => (
    <button onClick={askContractToMintNft} className="cta-button connect-wallet-button">
      Mint NFT
    </button>
  )

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header gradient-text">My NFT Collection</p>
          <p className="sub-text">
            Each unique. Each beautiful. Discover your NFT today.
          </p>
          {currentAccount === "" ? renderNotConnectedContainer() : renderMintUI()}
          <p className="header gradient-text">Owner side</p>

          <form onSubmit={askContractToListNft}>
            <input id='dropDays_id' className='cta-button connect-wallet-button' type="text" placeholder="Enter Drop days"></input>
            <input id='auctionDays_id' className='cta-button connect-wallet-button' type="text" placeholder="Enter Auction days"></input>
            <input id='price_id' className='cta-button connect-wallet-button' type="text" placeholder="Enter price"></input>
            <button style={{ marginLeft: 20 }} className='cta-button connect-wallet-button'>List Your NFT</button>
          </form>
          {/* ------------------- auction form-------------- */}
          <form onSubmit={askContractToEndAuction}>
            <input id='itemId_a_id' className='cta-button connect-wallet-button' type="text" placeholder="Enter ItemId"></input>
            <input id='price_id' className='cta-button connect-wallet-button' type="text" placeholder="Enter price"></input>
            <button style={{ marginLeft: 20 }} className='cta-button connect-wallet-button'>Auction End</button>
          </form>
          {/* <button onClick={askContractToListNft} style={{ marginLeft: 20 }} className='cta-button connect-wallet-button'>Auction End</button> */}

          <p className="header gradient-text">User side</p>

          {/* ------------------- bid form-------------- */}
          <form onSubmit={askContractToBidNft}>
            <input id='itemId_id' className='cta-button connect-wallet-button' type="text" placeholder="Enter ItemId"></input>
            <input id='bidValue_id' className='cta-button connect-wallet-button' type="text" placeholder="Enter bid amount"></input>
            <button style={{ marginLeft: 20 }} className='cta-button connect-wallet-button'>Bid</button>
          </form>
          <button style={{ marginLeft: 20 }} className='cta-button connect-wallet-button'>Buy</button>

          <div style={{ width: 300, height: 300 }}>
            {/* <h1>{finalSvg}</h1> */}
            <svg xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='xMinYMin meet' viewBox='0 0 350 350'><rect width='100%' height='100%' fill='purple' /><text x='50%' y='50%' font-size='25px' fill='pink' fontFamily='serif' dominant-baseline='middle' text-anchor='middle'>TheStrongestBlueHulk</text></svg>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;