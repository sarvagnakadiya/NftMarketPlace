// SPDX-License-Identifier: undefined
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

// import "./NFT.sol";

contract NFTMarket is ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;
    Counters.Counter private _itemsDeleted;
    address payable contractCreator;
    uint256 collectionCounter;
    uint256 listingChargesInPrecentage = 2;
    uint256 notableDropsCharge = 0.00002 ether;

    constructor() {
        contractCreator = payable(msg.sender);
    }

    struct Item {
        uint256 itemId;
        address nftContract;
        address payable creator;
        address payable seller;
        address payable owner;
        uint256 tokenId;
        uint256 dropEndTime;
        uint256 auctionEndTime;
        uint256 price;
        address highestBidder;
        uint256 highestBid;
        bool auctionEnded;
        bool sold;
    }
    struct Collection {
        string name;
        uint256 collectionId;
    }
    mapping(uint256 => Item) private items;
    mapping(uint256 => mapping(address => uint256)) bids;
    mapping(address => uint256[]) public userCollection;
    mapping(uint256 => uint256[]) public tokensInCollection;
    mapping(uint256 => Collection) public collection;
    // Events that will be emitted on changes.
    event HighestBidIncreased(address bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);
    /// The Auction is not open to bid yet.
    error AuctionNotOpen();
    /// Bid price is less than floor price.
    error BidPriceLessThanFloorPrice();
    /// The auction has already ended.
    error AuctionAlreadyEnded();
    /// There is already a higher or equal bid.
    error BidNotHighEnough(uint256 highestBid);
    /// The auction has not ended yet.
    error AuctionNotYetEnded();
    /// The function auctionEnd has already been called.
    error AuctionEndAlreadyCalled();
    event MarketItemCreated(
        uint256 indexed itemId,
        address indexed nftContract,
        address creator,
        address seller,
        address owner,
        uint256 indexed tokenId,
        uint256 dropDays,
        uint256 price,
        bool sold
    );
    event ProductListed(uint256 indexed itemId);
    modifier onlyItemOwner(uint256 id) {
        require(
            items[id].owner == msg.sender,
            "Only product owner can do this operation"
        );
        _;
    }

    function createCollection(string memory _name) public {
        collectionCounter += 1;
        collection[collectionCounter] = Collection(_name, collectionCounter);
    }

    function showPrice(uint256 _itemId) public view returns (uint256) {
        return items[_itemId].price;
    }

    /* Returns the listing price of the contract */
    function getListingPrice() public view returns (uint256) {
        return listingChargesInPrecentage;
    }

    /* Places an item for sale on the marketplace */
    modifier ownerOnly() {
        require(
            msg.sender == contractCreator,
            "Not authorised to create auction."
        );
        _;
    }

    // function fetchMsgValue() public payable returns (uint256 _value) {
    //     uint256 value = _value;
    //     value = msg.value;
    //     return value;
    // }

    function createItem(
        address _nftContract,
        uint256 _tokenId,
        uint256 _dropDays,
        uint256 _auctionDays,
        uint256 _price
    ) public payable nonReentrant {
        // uint256 mv = fetchMsgValue();
        require(_price > 0, "Price must be at least 1 wei");
        // if (_dropDays != 0) {
        //     require(
        //         mv == notableDropsCharge,
        //         "Provide the charges to utilise notable drops."
        //     );
        // }

        _itemIds.increment();
        uint256 itemId = _itemIds.current();

        items[itemId] = Item(
            itemId,
            _nftContract,
            payable(msg.sender),
            payable(msg.sender),
            payable(address(0)),
            _tokenId,
            (block.timestamp + (_dropDays * 86400)),
            (block.timestamp + (_auctionDays * 86400)),
            _price,
            address(0),
            0,
            false,
            false
        );
        IERC721(_nftContract).transferFrom(msg.sender, address(this), _tokenId);
        payable(contractCreator).transfer(msg.value);
        emit MarketItemCreated(
            itemId,
            _nftContract,
            msg.sender,
            msg.sender,
            address(0),
            _tokenId,
            _price,
            _dropDays,
            false
        );
    }

    /// Bid on the auction with the value sent
    /// together with this transaction.
    /// The value will only be refunded if the
    /// auction is not won.
    function bid(uint256 _itemId) external payable {
        if (block.timestamp > items[_itemId].dropEndTime)
            revert AuctionNotOpen();
        if (block.timestamp > items[_itemId].auctionEndTime)
            revert AuctionAlreadyEnded();
        if (msg.value < items[_itemId].price)
            revert BidPriceLessThanFloorPrice();
        if (msg.value <= items[_itemId].highestBid)
            revert BidNotHighEnough(items[_itemId].highestBid);
        if (items[_itemId].highestBid != 0) {
            bids[_itemId][items[_itemId].highestBidder] += items[_itemId]
                .highestBid;
        }

        items[_itemId].highestBidder = msg.sender;
        items[_itemId].highestBid = msg.value;
        emit HighestBidIncreased(msg.sender, msg.value);
    }

    function increaseBid(uint256 _itemId)
        external
        payable
        eligibleOnly(_itemId)
    {
        if (block.timestamp > items[_itemId].dropEndTime)
            revert AuctionNotOpen();
        if (block.timestamp > items[_itemId].auctionEndTime)
            revert AuctionAlreadyEnded();
        if (
            (msg.value + bids[_itemId][msg.sender]) <= items[_itemId].highestBid
        ) revert BidNotHighEnough(items[_itemId].highestBid);
        bids[_itemId][items[_itemId].highestBidder] += items[_itemId]
            .highestBid;
        items[_itemId].highestBidder = msg.sender;
        items[_itemId].highestBid = msg.value + bids[_itemId][msg.sender];
        bids[_itemId][msg.sender] = 0;
        emit HighestBidIncreased(msg.sender, msg.value);
    }

    function withdrawlEligibility(uint256 _itemId) public view returns (bool) {
        if (
            msg.sender != items[_itemId].highestBidder &&
            (bids[_itemId][msg.sender] != 0)
        ) return true;
        else return false;
    }

    modifier eligibleOnly(uint256 _itemId) {
        require(
            msg.sender != items[_itemId].highestBidder,
            "Feature not allowed for highest bidder."
        );
        require(
            bids[_itemId][msg.sender] != 0,
            "Place a bid to use this feature."
        );
        _;
    }

    /// Withdraw a bid that was overbid.
    function withdraw(uint256 _itemId)
        external
        eligibleOnly(_itemId)
        returns (bool)
    {
        uint256 amount = bids[_itemId][msg.sender];
        if (amount > 0) {
            bids[_itemId][msg.sender] = 0;
            if (!payable(msg.sender).send(amount)) {
                bids[_itemId][msg.sender] = amount;
                return false;
            }
        }
        return true;
    }

    modifier creatorOnly(uint256 _itemId) {
        require(
            msg.sender == items[_itemId].creator,
            "Only creator can end the auction."
        );
        _;
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function auctionEnd(uint256 _itemId, uint256 _price)
        external
        creatorOnly(_itemId)
    {
        if (items[_itemId].auctionEnded) revert AuctionEndAlreadyCalled();
        items[_itemId].auctionEnded = true;
        emit AuctionEnded(
            items[_itemId].highestBidder,
            items[_itemId].highestBid
        );
        if (items[_itemId].highestBid != 0) {
            _price = items[_itemId].highestBid;
            sendNft(_itemId, _price);
            //here
        }
    }

    modifier auctionCheck(uint256 _itemId) {
        require(
            items[_itemId].auctionEnded == true,
            "The auction has not ended yet."
        );
        _;
    }

    /* Creates the sale of a marketplace item */
    /* Transfers ownership of the item, as well as funds between parties */
    function buyItemFromMarket(uint256 _itemId)
        public
        payable
        auctionCheck(_itemId)
        nonReentrant
    {
        uint256 _price = msg.value;
        uint256 price = items[_itemId].price;
        require(_price == price, Strings.toString(price));
        buy(_itemId, _price);
    }

    function buy(uint256 _itemId, uint256 _price) public {
        address _nftContract = items[_itemId].nftContract;
        uint256 tokenId = items[_itemId].tokenId;
        items[_itemId].seller.transfer(
            _price - ((_price * listingChargesInPrecentage) / 100)
        );
        IERC721(_nftContract).transferFrom(address(this), msg.sender, tokenId);
        items[_itemId].owner = payable(msg.sender);
        items[_itemId].sold = true;
        _itemsSold.increment();
        payable(contractCreator).transfer(
            (_price * listingChargesInPrecentage) / 100
        );
    }

    function sendNft(uint256 _itemId, uint256 _price) public {
        address _nftContract = items[_itemId].nftContract;
        uint256 tokenId = items[_itemId].tokenId;
        address hb_winner = items[_itemId].highestBidder;
        items[_itemId].seller.transfer(
            _price - ((_price * listingChargesInPrecentage) / 100)
        );
        IERC721(_nftContract).transferFrom(address(this), hb_winner, tokenId);
        items[_itemId].owner = payable(hb_winner);
        items[_itemId].sold = true;
        _itemsSold.increment();
        payable(contractCreator).transfer(
            (_price * listingChargesInPrecentage) / 100
        );
    }

    /* Returns all unsold market items */
    function fetchMarketItems() public view returns (Item[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 unsoldItemCount = _itemIds.current() -
            _itemsSold.current() -
            _itemsDeleted.current();
        uint256 currentIndex = 0;
        Item[] memory allItems = new Item[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            if (items[i + 1].owner == address(0)) {
                uint256 currentId = i + 1;
                Item storage currentItem = items[currentId];
                allItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return allItems;
    }

    /* Returns onlyl items that a user has purchased */
    function fetchMyNFTs() public view returns (Item[] memory) {
        uint256 totalItemCount = _itemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (items[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }
        Item[] memory allItems = new Item[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (items[i + 1].owner == msg.sender) {
                uint256 currentId = i + 1;
                Item storage currentItem = items[currentId];
                allItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return allItems;
    }

    function fetchItemsCreated() public view returns (Item[] memory) {
        uint256 totalItemCount = _itemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (items[i + 1].creator == msg.sender) {
                itemCount += 1;
            }
        }
        Item[] memory allItems = new Item[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (items[i + 1].creator == msg.sender) {
                uint256 currentId = i + 1;
                Item storage currentItem = items[currentId];
                allItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return allItems;
    }

    /* Returns all the items created by different authors. */
    function fetchAuthorsCreations(address author)
        public
        view
        returns (Item[] memory)
    {
        uint256 totalItemCount = _itemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (items[i + 1].creator == author && !items[i + 1].sold) {
                itemCount += 1;
            }
        }
        Item[] memory allItems = new Item[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (items[i + 1].creator == author && !items[i + 1].sold) {
                uint256 currentId = i + 1;
                Item storage currentItem = items[currentId];
                allItems[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return allItems;
    }
}
