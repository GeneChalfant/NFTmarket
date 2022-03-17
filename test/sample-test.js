const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("NFTMarket", function () {
  it("Should create and execute market sales", async function () {
    // make a new market
    const Market = await ethers.getContractFactory("NFTMarket")
    const market = await Market.deploy()
    await market.deployed()
    const marketAddress = market.address.toString()

    // make a new NFT
    const NFT = await ethers.getContractFactory("NFT")
    const nft = await NFT.deploy(marketAddress)
    await nft.deployed()
    const nftContractAddress = nft.address

    // listingPrice is the fee taken by contract owner for listing in marketplace
    let listingPrice = await market.getListingPrice()
    listingPrice = listingPrice.toString()

    // set a sale price
    const auctionPrice = ethers.utils.parseUnits("100", "ether")

    // create the NFTs
    await nft.createToken("https://www.mytokenlocation.com")
    await nft.createToken("https://www.mytokenlocation2.com")

    // list the NFTs on the marketplace
    await market.createMarketItem(nftContractAddress, 1, auctionPrice, {
      value: listingPrice,
    })
    await market.createMarketItem(nftContractAddress, 2, auctionPrice, {
      value: listingPrice,
    })

    // get the payment for listing
    const [_, buyerAddress] = await ethers.getSigners()

    // list the NFT
    await market
      .connect(buyerAddress)
      .createMarketSale(nftContractAddress, 1, { value: auctionPrice })

    // get the catalog of NFTs for sale
    let items = await market.fetchMarketItems()

    items = await Promise.all(
      items.map(async (i) => {
        const tokenUri = await nft.tokenURI(i.tokenId)
        let item = {
          price: i.price.toString(),
          tokenId: i.tokenId.toString(),
          seller: i.seller,
          owner: i.owner,
          tokenUri,
        }
        return item
      })
    )

    console.log("items:", items)
  })
})
