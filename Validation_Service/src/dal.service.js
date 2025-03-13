require("dotenv").config();
const pinataSDK = require("@pinata/sdk");
const axios = require("axios");

var pinataApiKey = "";
var pinataSecretApiKey = "";
var ipfsGateway = "";

function init() {
  pinataApiKey = process.env.PINATA_API_KEY;
  pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
  ipfsGateway = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
}

async function fetchFromIpfs(cid) {
  try {
    const response = await axios.get(`${ipfsGateway}/${cid}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching from IPFS:", error);
    throw new Error(`IPFS fetch failed: ${error.message}`);
  }
}

async function publishJSONToIpfs(data) {
  try {
    const pinata = new pinataSDK(pinataApiKey, pinataSecretApiKey);
    const response = await pinata.pinJSONToIPFS(data);
    console.log(`Published to IPFS with CID: ${response.IpfsHash}`);
    return response.IpfsHash;
  } catch (error) {
    console.error("Error publishing to IPFS:", error);
    throw new Error(`IPFS publish failed: ${error.message}`);
  }
}

module.exports = {
  init,
  fetchFromIpfs,
  publishJSONToIpfs,
};
