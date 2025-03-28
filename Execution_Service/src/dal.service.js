require("dotenv").config();
const pinataSDK = require("@pinata/sdk");
const ethers = require("ethers");

let pinataApiKey = "";
let pinataSecretApiKey = "";
let rpcBaseAddress = "";
let privateKey = "";

function init() {
  pinataApiKey = process.env.PINATA_API_KEY;
  pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
  rpcBaseAddress = process.env.OTHENTIC_CLIENT_RPC_ADDRESS;
  privateKey = process.env.PRIVATE_KEY_PERFORMER;
}

async function sendTask(proofOfTask, data, taskDefinitionId) {
  var wallet = new ethers.Wallet(privateKey);
  var performerAddress = wallet.address;


  // If data is already in hex format, use it directly
  // Otherwise, convert it to hex
  if (!data.startsWith('0x')) {
    data = ethers.hexlify(ethers.toUtf8Bytes(data));
  }


  const message = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "bytes", "address", "uint16"],
    [proofOfTask, data, performerAddress, taskDefinitionId]
  );

  
  const messageHash = ethers.keccak256(message);
  const sig = wallet.signingKey.sign(messageHash).serialized;

  const jsonRpcBody = {
    jsonrpc: "2.0",
    method: "sendTask",
    params: [proofOfTask, data, taskDefinitionId, performerAddress, sig],
  };
  try {
    const provider = new ethers.JsonRpcProvider(rpcBaseAddress);
    const response = await provider.send(
      jsonRpcBody.method,
      jsonRpcBody.params
    );
    console.log("API response:", response);
  } catch (error) {
    console.error("Error making API request:", error);
  }
}

async function publishJSONToIpfs(data) {
  var proofOfTask = "";
  try {
    const pinata = new pinataSDK(pinataApiKey, pinataSecretApiKey);
    const response = await pinata.pinJSONToIPFS(data);
    proofOfTask = response.IpfsHash;
    console.log(`proofOfTask: ${proofOfTask}`);
  } catch (error) {
    console.error("Error making API request to pinataSDK:", error);
    throw error;
  }
  return proofOfTask;
}

module.exports = {
  init,
  publishJSONToIpfs,
  sendTask,
};
