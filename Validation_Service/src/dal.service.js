require("dotenv").config();
const axios = require("axios");

var ipfsHost = "";

function init() {
  ipfsHost = process.env.IPFS_HOST;
}

async function fetchFromIpfs(cid) {
  try {
    const { data } = await axios.get(ipfsHost + cid);
    return data;
  } catch (error) {
    console.error("Error fetching from IPFS:", error);
    throw new Error(`IPFS fetch failed: ${error.message}`);
  }
}

module.exports = {
  init,
  fetchFromIpfs,
};
