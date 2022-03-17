// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract NFTMarket is ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;

    address payable owner;

    // this is the fee for using this marketplace
    // actually will be using MATIC, so today (Jan 2022) this is about 5 cents
    uint256 listingPrice = 0.025 ether;

    // Set owner/deployer of this contract. They will be paid commissions.
    constructor () {
        owner = payable(msg.sender);
    }

    // an NFT listing
    struct MarketItem {
        uint itemId;

        // this is the location of the NFT (an ERC-721 contract) on chain
        address nftContract;

        uint256 tokenId;
        address payable seller;
        address payable owner;      // this will be the new NFT owner. it's empty until it's sold.
        uint256 price;
        bool sold;
    }

    // this is the list of all the NFTs listed for sale (and owned by this contract)
    mapping (uint256 => MarketItem) private idToMarketItem;

    // an NFT is newly listed for sale
    event MarketItemCreated (
        uint indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) public payable nonReentrant {

        // price is the asking price for the NFT on the listing
        require (price > 0, "Price must be at least 1 wei");

        // listingPrice is the fee to list & must be paid in advance
        // will be held by this contract until item is sold
        require (msg.value == listingPrice, "Price must be equal to listing price");

        _itemIds.increment();
        uint256 itemId = _itemIds.current();

        // MarketItem is the NFT that's being listed for sale. This makes a new one.
        idToMarketItem[itemId] = MarketItem (
            itemId,
            nftContract,
            tokenId,
            payable(msg.sender),
            payable(address(0)),
            price,
            false
        );

        // The NFT ownership will be transferred to this contract upon listing
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        emit MarketItemCreated(itemId, nftContract, tokenId, msg.sender, owner, price, false);
    }

    // sell a NFT from the market
    function createMarketSale(
        address nftContract,
        uint256 itemId
    ) public payable nonReentrant {
        uint price = idToMarketItem[itemId].price;
        uint tokenId = idToMarketItem[itemId].tokenId;

        require(msg.value == price, "Please submit the asking price in order to complete purchase");

        // send money to the seller that was received in this txn
        idToMarketItem[itemId].seller.transfer(msg.value);

        // transfer NFT (ownership) from this contract to buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        // In the local data, set the msg sender (buyer) to be the new owner
        // thus keeping a record of the sale (current owner)
        idToMarketItem[itemId].owner = payable(msg.sender);

        // the NFT is sold, count all items sold
        idToMarketItem[itemId].sold = true;
        _itemsSold.increment();

        // pay commission (listingPrice) to this contract owner
        payable(owner).transfer(listingPrice);
    }

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint itemCount = _itemIds.current();
        uint unsoldItemCount = _itemIds.current() - _itemsSold.current();
        uint currentIndex = 0;  // a local loop counter

        // define a new array to hold all the unsold NFTs available to buy
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);

        // loop over all items, check if sold, and if it is, skip it
        for (uint i=0; i<itemCount; i++) {
            if (idToMarketItem[i+1].owner == address(0)) {
                uint currentId = idToMarketItem[i+1].itemId;

                // create a new listing item for the found (unsold) item
                MarketItem storage currentItem = idToMarketItem[currentId]; // this just defines a reference to storage
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchMyNFTs() public view returns (MarketItem[] memory) {
        uint totalItemCount = _itemIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        // loop just counts items belonging to this user (the one calling)
        // so that the array can be allocated correctly
        for (uint i=0; i<totalItemCount; i++) {
            if (idToMarketItem[i+1].owner == msg.sender) {
                itemCount += 1;
            }
        }

        // alloc array holding my NFTs
        MarketItem[] memory items = new MarketItem[](itemCount);

        // loop to actually fill items[] with my NFTs
        for (uint i=0; i<totalItemCount; i++) {
            if (idToMarketItem[i+1].owner == msg.sender) {
                uint currentId = idToMarketItem[i+1].itemId;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    // itemsCreated are those with seller == msg.sender
    // meaning sender (requestor) created the listing & maybe sold it
    function fetchItemsCreated() public view returns (MarketItem[] memory) {
        uint totalItemCount = _itemIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        // loop just counts items belonging to this user (the one calling)
        // so that the array can be allocated correctly
        for (uint i=0; i<totalItemCount; i++) {
            if (idToMarketItem[i+1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        // alloc array holding my NFTs
        MarketItem[] memory items = new MarketItem[](itemCount);

        // loop to actually fill items[] with NFTs I sold
        for (uint i=0; i<totalItemCount; i++) {
            if (idToMarketItem[i+1].seller == msg.sender) {
                uint currentId = idToMarketItem[i+1].itemId;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
}