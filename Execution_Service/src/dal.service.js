require("dotenv").config();
const pinataSDK = require("@pinata/sdk");
const { ethers } = require("ethers");

// ABI for Policy Registry contract interface
const POLICY_REGISTRY_ABI = [
  "function validateTransaction(bytes32 safeTxHash, uint256 agentId) view returns (bool isValid, string memory reason)",
  "function getAgentPolicies(uint256 agentId) view returns (uint256[] memory policyIds)",
];

var pinataApiKey = "";
var pinataSecretApiKey = "";
var rpcBaseAddress = "";
var privateKey = "";
var policyRegistryAddress = "";

function init() {
  pinataApiKey = process.env.PINATA_API_KEY;
  pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
  rpcBaseAddress = process.env.OTHENTIC_CLIENT_RPC_ADDRESS;
  privateKey = process.env.PRIVATE_KEY_PERFORMER;
  policyRegistryAddress = process.env.POLICY_REGISTRY_ADDRESS;
}

async function validateTransaction(safeTxHash, agentId) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcBaseAddress);
    const policyRegistry = new ethers.Contract(
      policyRegistryAddress,
      POLICY_REGISTRY_ABI,
      provider
    );

    // Call the policy registry to validate the transaction
    const [isValid, reason] = await policyRegistry.validateTransaction(
      safeTxHash,
      agentId
    );

    return {
      isValid,
      reason,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error validating transaction:", error);
    throw new Error(`Policy validation failed: ${error.message}`);
  }
}

async function sendTask(proofOfTask, data, taskDefinitionId) {
  var wallet = new ethers.Wallet(privateKey);
  var performerAddress = wallet.address;

  data = ethers.hexlify(ethers.toUtf8Bytes(data));
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
  validateTransaction,
};
