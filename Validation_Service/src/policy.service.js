require("dotenv").config();
const { ethers } = require("ethers");

// ABI for Policy Registry contract interface
const POLICY_REGISTRY_ABI = [
  "function validateTransaction(bytes32 safeTxHash, uint256 agentId) view returns (bool isValid, string memory reason)",
  "function getAgentPolicies(uint256 agentId) view returns (uint256[] memory policyIds)",
];

let policyRegistryChainRpcUrl = "";
let policyRegistryAddress = "";

function init() {
  policyRegistryChainRpcUrl = process.env.POLICY_REGISTRY_CHAIN_RPC_URL;
  policyRegistryAddress = process.env.POLICY_REGISTRY_ADDRESS;
}

async function validateTransaction(safeTxHash, agentId) {
  try {
    const provider = new ethers.JsonRpcProvider(policyRegistryChainRpcUrl);
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

module.exports = {
  init,
  validateTransaction,
};
