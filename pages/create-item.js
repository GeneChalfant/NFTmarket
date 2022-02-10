import { useState } from 'react'
import { ethers } from 'ethers'
import { Web3Storage } from 'web3.storage'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'

// Web3.Storage API key
function getAccessToken() {
  return process.env.W3S_KEY
}

// contract addresses
import { nftaddress, nftmarketaddress } from '../market.config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'
// import createStatsCollector from 'mocha/lib/stats-collector'

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null)
  const [formInput, updateFormInput] = useState({
    price: '',
    name: '',
    description: '',
  })
  const router = useRouter()

  const token = getAccessToken()
  const client = new Web3Storage({ token: token })

  async function onChange(e) {
    const files = e.target.files

    try {
      const cid = await client.put(files)

      const url = `https://${cid}.ipfs.dweb.link/${files[0].name}`
      setFileUrl(url)
    } catch (e) {
      console.log(e)
    }
  }

  // build the NFT and upload its assets to IPFS
  async function createItem() {
    const { name, description, price } = formInput
    if (!name || !description || !price || !fileUrl) {
      console.log('Fill in all fields')
      return
    }

    // prepare NFT data
    const blob = new Blob(
      [JSON.stringify({ name, description, image: fileUrl })],
      { type: 'application/json' }
    )
    const nftData = [new File([blob], name)]

    // send NFT data to IPFS
    try {
      // todo: add a progress indicator
      const cid = await client.put(nftData)
      const url = `https://${cid}.ipfs.dweb.link/${name}`

      createSale(url)
    } catch (error) {
      console.log('Error uploading file: ', error)
    }
  }

  // mint NFT and list on marketplace onchain
  async function createSale(fileUrl) {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    // create NFT on chain
    let contract = new ethers.Contract(nftaddress, NFT.abi, signer)
    let transaction = await contract.createToken(fileUrl)
    let tx = await transaction.wait()

    let event = tx.events[0]
    let value = event.args[2]
    let tokenId = value.toNumber()

    // convert entered asking price  to wei
    const price = ethers.utils.parseUnits(formInput.price, 'ether')

    // create market listing on chain
    contract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    let listingPrice = await contract.getListingPrice()
    listingPrice = listingPrice.toString()

    transaction = await contract.createMarketItem(nftaddress, tokenId, price, {
      value: listingPrice,
    })
    await transaction.wait()
    router.push('/')
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Matic"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && <img className="rounded mt-4" width="350" src={fileUrl} />}
        <button
          onClick={createItem}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg"
        >
          Create Digital Asset
        </button>
      </div>
    </div>
  )
}
